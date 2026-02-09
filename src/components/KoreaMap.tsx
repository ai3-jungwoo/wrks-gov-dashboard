'use client';

/**
 * KoreaMap 컴포넌트
 *
 * D3.js를 사용하여 한국 지도를 렌더링하고, 고객사 데이터를 시각화합니다.
 * - 시/도 단위: 교육청 데이터 (색상으로 사용금액 표시)
 * - 시/군/구 단위: 지자체 데이터 (색상으로 사용금액 표시)
 *
 * @component
 * @example
 * <KoreaMap
 *   data={educationData}
 *   type="province"
 *   colorScheme="indigo"
 *   onRegionSelect={(region, data) => console.log(region, data)}
 * />
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Client, AggregatedData, formatMoney } from '@/data/clients';
import {
  PROVINCE_EN_TO_KR,
  MUNICIPALITY_KR_TO_EN,
  toKoreanName,
  cleanRegionName,
  isSameRegion,
} from '@/data/regionMappings';

// ============================================================================
// 타입 정의
// ============================================================================

interface KoreaMapProps {
  /** 표시할 고객사 데이터 배열 */
  data: Client[];
  /** 지도 타입: 'province' (시/도) | 'municipality' (시/군/구) */
  type: 'province' | 'municipality';
  /** 색상 스키마: 'indigo' (교육청) | 'green' (지자체) */
  colorScheme: 'indigo' | 'green';
  /** 지역 선택 시 호출되는 콜백 */
  onRegionSelect?: (region: string, data: AggregatedData | null) => void;
  /** PoC 판단 기준 금액 (기본값: 100,000원) */
  pocThreshold?: number;
  /** PoC 데이터 표시 여부 */
  showPoc?: boolean;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** GeoJSON 데이터 URL */
const GEOJSON_URLS = {
  province: 'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-provinces-geo.json',
  municipality: 'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-municipalities-geo.json',
} as const;

/** 최대 재시도 횟수 */
const MAX_RETRIES = 3;

/** 재시도 간격 (ms) */
const RETRY_DELAY = 1000;

/** 색상 범위 설정 */
const COLOR_RANGES = {
  indigo: ['#e0e7ff', '#4f46e5'] as [string, string],
  green: ['#d1fae5', '#059669'] as [string, string],
} as const;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 지정된 시간만큼 대기
 * @param ms 대기 시간 (밀리초)
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 재시도 로직이 포함된 fetch 함수
 * @param url 요청 URL
 * @param retries 남은 재시도 횟수
 * @returns 응답 데이터
 * @throws 모든 재시도 실패 시 에러
 */
async function fetchWithRetry<T>(url: string, retries = MAX_RETRIES): Promise<T> {
  try {
    const response = await d3.json<T>(url);
    if (!response) {
      throw new Error('Empty response received');
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`지도 데이터 로드 실패, ${retries}회 재시도 남음...`);
      await delay(RETRY_DELAY);
      return fetchWithRetry<T>(url, retries - 1);
    }
    throw error;
  }
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function KoreaMap({
  data,
  type,
  colorScheme,
  onRegionSelect,
  pocThreshold = 100000,
  showPoc = true,
}: KoreaMapProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ============================================================================
  // 데이터 집계 (메모이제이션)
  // ============================================================================

  /**
   * 지역별 데이터 집계
   * 시/도 또는 시/군/구 단위로 그룹화하여 합계 계산
   */
  const aggregatedData = useMemo(() => {
    const result: Record<string, AggregatedData> = {};

    data.forEach(item => {
      // 시/도 단위면 region, 시/군/구 단위면 subRegion 사용
      const key = type === 'province' ? item.region : (item.subRegion || item.region);
      if (!key) return;

      if (!result[key]) {
        result[key] = { charge: 0, usage: 0, items: [] };
      }
      result[key].charge += item.charge;
      result[key].usage += item.usage;
      result[key].items.push(item);
    });

    return result;
  }, [data, type]);

  /**
   * 최대 사용금액 (색상 스케일용)
   * 시/도: 1억원, 시/군/구: 1천만원 기준
   */
  const maxCharge = useMemo(() => {
    const dataMax = Math.max(...Object.values(aggregatedData).map(r => r.charge), 0);
    const defaultMax = type === 'province' ? 100_000_000 : 10_000_000;
    return Math.max(dataMax, defaultMax);
  }, [aggregatedData, type]);

  /**
   * 색상 스케일 함수
   */
  const colorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([0, maxCharge])
      .range(COLOR_RANGES[colorScheme]);
  }, [maxCharge, colorScheme]);

  // ============================================================================
  // 지역명 매칭 함수 (메모이제이션)
  // ============================================================================

  /**
   * 시/도 지역명으로 데이터 찾기
   * GeoJSON의 영어 지역명을 한글로 변환 후 매칭
   */
  const findProvinceData = useCallback((englishName: string): {
    key: string;
    data: AggregatedData;
    koreanName: string;
  } | null => {
    const koreanName = toKoreanName(englishName, 'province');

    // 1. 정확한 매칭 시도
    if (aggregatedData[koreanName]) {
      return { key: koreanName, data: aggregatedData[koreanName], koreanName };
    }

    // 2. 부분 매칭 시도 (접미사 제거 후 비교)
    const matchKey = Object.keys(aggregatedData).find(key => isSameRegion(koreanName, key));

    return matchKey
      ? { key: matchKey, data: aggregatedData[matchKey], koreanName }
      : null;
  }, [aggregatedData]);

  /**
   * 시/군/구 지역명으로 데이터 찾기
   * GeoJSON의 영어 NAME_2를 한글로 변환 후 매칭
   */
  const findMunicipalityData = useCallback((englishName2: string): {
    key: string;
    data: AggregatedData;
    koreanName: string;
  } | null => {
    // 영어 → 한글 변환 (역매핑)
    const koreanName = Object.entries(MUNICIPALITY_KR_TO_EN)
      .find(([, en]) => en === englishName2)?.[0] || englishName2;

    // 1. 정확한 매칭 시도
    if (aggregatedData[koreanName]) {
      return { key: koreanName, data: aggregatedData[koreanName], koreanName };
    }

    // 2. 부분 매칭 시도
    const cleanName = cleanRegionName(koreanName);
    const matchKey = Object.keys(aggregatedData).find(key => {
      const cleanKey = cleanRegionName(key);
      return cleanKey === cleanName || cleanKey.includes(cleanName) || cleanName.includes(cleanKey);
    });

    return matchKey
      ? { key: matchKey, data: aggregatedData[matchKey], koreanName }
      : null;
  }, [aggregatedData]);

  // ============================================================================
  // 지도 그리기
  // ============================================================================

  useEffect(() => {
    if (!containerRef.current) return;

    const drawMap = async () => {
      setLoading(true);
      setError(null);

      const container = d3.select(containerRef.current);
      container.selectAll('svg').remove();

      const width = containerRef.current!.getBoundingClientRect().width;
      const height = width * 1.3;

      // SVG 요소 생성
      const svg = container
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', 'auto');

      try {
        // GeoJSON 데이터 로드 (재시도 로직 포함)
        const geojson = await fetchWithRetry<GeoJSON.FeatureCollection>(GEOJSON_URLS[type]);

        // 지도 투영 설정
        const projection = d3.geoMercator()
          .fitSize([width - 40, height - 40], geojson);

        const path = d3.geoPath().projection(projection);

        // SVG 그룹 생성 (지도 배경 / 라벨 분리로 hover 시 깜빡임 방지)
        const mapGroup = svg.append('g').attr('class', 'map-background');
        const labelGroup = svg.append('g').attr('class', 'labels');

        /**
         * GeoJSON Feature에서 지역명 추출
         */
        const getRegionName = (d: GeoJSON.Feature): string => {
          if (type === 'municipality') {
            return (d.properties?.NAME_2 || d.properties?.name || '') as string;
          }
          return (d.properties?.NAME_1 || d.properties?.name || '') as string;
        };

        /**
         * 지역의 채우기 색상 결정
         */
        const getFillColor = (d: GeoJSON.Feature): string => {
          const name = getRegionName(d);
          const match = type === 'province'
            ? findProvinceData(name)
            : findMunicipalityData(name);

          if (!match) return '#f1f5f9'; // 데이터 없음: 연한 회색
          if (match.data.charge < pocThreshold) return '#cbd5e1'; // PoC: 중간 회색
          return colorScale(match.data.charge);
        };

        /**
         * 툴팁 내용 생성
         */
        const getTooltipContent = (d: GeoJSON.Feature): string => {
          const name = getRegionName(d);
          const name1 = (d.properties?.NAME_1 || '') as string;
          const match = type === 'province'
            ? findProvinceData(name)
            : findMunicipalityData(name);

          const displayName = match?.koreanName || toKoreanName(name, type);
          const isPoc = match && match.data.charge < pocThreshold;
          const parentRegion = type === 'municipality' ? toKoreanName(name1, 'province') : '';

          return `
            <div class="font-bold text-sm mb-1">
              ${displayName}
              ${isPoc ? '<span class="text-xs font-normal text-amber-400">(PoC)</span>' : ''}
              ${parentRegion ? `<span class="font-normal text-slate-400"> (${parentRegion})</span>` : ''}
            </div>
            <div class="text-xs text-slate-300">
              ${match ? `
                사용금액: ${formatMoney(match.data.charge)}<br/>
                사용량: ${match.data.usage.toLocaleString()}<br/>
                ${match.data.items.length > 0 ? `<br/>📍 ${match.data.items.slice(0, 3).map(i => i.name).join(', ')}${match.data.items.length > 3 ? ` 외 ${match.data.items.length - 3}개` : ''}` : ''}
              ` : '데이터 없음'}
            </div>
          `;
        };

        // 지도 경로 그리기
        mapGroup.selectAll('path')
          .data(geojson.features)
          .enter()
          .append('path')
          .attr('d', d => path(d) || '')
          .attr('fill', getFillColor)
          .attr('stroke', '#fff')
          .attr('stroke-width', type === 'province' ? 0.5 : 0.3)
          .style('cursor', 'pointer')
          .style('transition', 'fill 0.15s')
          // 마우스 이벤트 핸들러
          .on('mouseenter', function(event, d) {
            d3.select(this)
              .attr('stroke', '#333')
              .attr('stroke-width', type === 'province' ? 1.5 : 1);

            if (tooltipRef.current) {
              tooltipRef.current.innerHTML = getTooltipContent(d);
              tooltipRef.current.style.opacity = '1';
            }
          })
          .on('mousemove', function(event) {
            if (tooltipRef.current) {
              tooltipRef.current.style.left = `${event.pageX + 15}px`;
              tooltipRef.current.style.top = `${event.pageY + 15}px`;
            }
          })
          .on('mouseleave', function() {
            d3.select(this)
              .attr('stroke', '#fff')
              .attr('stroke-width', type === 'province' ? 0.5 : 0.3);

            if (tooltipRef.current) {
              tooltipRef.current.style.opacity = '0';
            }
          })
          .on('click', function(event, d) {
            const name = getRegionName(d);
            const match = type === 'province'
              ? findProvinceData(name)
              : findMunicipalityData(name);

            const displayName = match?.koreanName || toKoreanName(name, type);
            onRegionSelect?.(displayName, match?.data || null);
          });

        // 시/도 단위일 때만 라벨 표시
        if (type === 'province') {
          labelGroup.selectAll('text')
            .data(geojson.features)
            .enter()
            .append('text')
            .attr('x', d => path.centroid(d)[0])
            .attr('y', d => path.centroid(d)[1])
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('font-weight', d => findProvinceData(getRegionName(d)) ? '600' : '400')
            .attr('fill', d => findProvinceData(getRegionName(d)) ? '#1e1b4b' : '#94a3b8')
            .style('pointer-events', 'none') // 라벨이 클릭 이벤트를 가로채지 않도록
            .text(d => {
              const koreanName = toKoreanName(getRegionName(d), 'province');
              return cleanRegionName(koreanName);
            });
        }

        setLoading(false);
        setRetryCount(0); // 성공 시 재시도 카운트 초기화
      } catch (err) {
        console.error('지도 렌더링 에러:', err);
        setError('지도를 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.');
        setLoading(false);
      }
    };

    drawMap();
  }, [data, type, colorScheme, onRegionSelect, pocThreshold, showPoc, aggregatedData, colorScale, findProvinceData, findMunicipalityData]);

  // ============================================================================
  // 재시도 핸들러
  // ============================================================================

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
    // useEffect가 다시 실행되도록 상태 변경
  }, []);

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className="relative">
      {/* 지도 컨테이너 */}
      <div ref={containerRef} className="w-full min-h-[400px]">
        {/* 로딩 상태 */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span>지도를 불러오는 중...</span>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className="text-red-500 text-lg">⚠️</div>
              <p className="text-red-600 text-sm">{error}</p>
              {retryCount < MAX_RETRIES && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg transition-colors"
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 툴팁 */}
      <div
        ref={tooltipRef}
        className="fixed bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl z-50 pointer-events-none opacity-0 transition-opacity max-w-[280px]"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
