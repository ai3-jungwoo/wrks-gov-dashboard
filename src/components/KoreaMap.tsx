'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Client, AggregatedData, formatMoney } from '@/data/clients';

// 영어 → 한글 지역명 매핑 (GeoJSON이 영어로 되어있음)
const REGION_EN_TO_KR: Record<string, string> = {
  // 시/도
  'Seoul': '서울특별시',
  'Busan': '부산광역시',
  'Daegu': '대구광역시',
  'Incheon': '인천광역시',
  'Gwangju': '광주광역시',
  'Daejeon': '대전광역시',
  'Ulsan': '울산광역시',
  'Gyeonggi-do': '경기도',
  'Gangwon-do': '강원특별자치도',
  'Chungcheongbuk-do': '충청북도',
  'Chungcheongnam-do': '충청남도',
  'Jeollabuk-do': '전북특별자치도',
  'Jeollanam-do': '전라남도',
  'Gyeongsangbuk-do': '경상북도',
  'Gyeongsangnam-do': '경상남도',
  'Jeju': '제주특별자치도',
};

// 한글 → 영어 지역명 매핑 (시/군/구용)
const REGION_KR_TO_EN: Record<string, string> = {
  // 시/군/구
  '수원시': 'Suwon',
  '창원시': 'Changwon',
  '강동구': 'Gandong',
  '서초구': 'Seocho',
  '영등포구': 'Yeongdeungpo',
  '성북구': 'Seongbuk',
  '장성군': 'Jangseong',
  '동구': 'Dong',
  '성동구': 'Seongdong',
  '음성군': 'Eumseong',
  '송파구': 'Songpa',
  '동작구': 'Dongjak',
  '사천시': 'Sacheon',
  '강남구': 'Gangnam',
  '광진구': 'Gwang-jin',
  '강서구': 'Gangseo',
  '서산시': 'Seosan',
  '남해군': 'Namhae',
  '하동군': 'Hadong',
  '광양시': 'Gwangyang',
  '중구': 'Jung',
  '용산구': 'Yongsan',
  '옥천군': 'Okcheon',
  '의왕시': 'Uiwang',
  '금천구': 'Geum-cheon',
  '괴산군': 'Goesan',
  '군포시': 'Gunpo',
  '증평군': 'Jeungpyeong',
  '양산시': 'Yangsan',
  '부여군': 'Buyeo',
  '서귀포시': 'Seogwipo',
  '강진군': 'Gangjin',
  '강릉시': 'Gangneung',
  '은평구': 'Eun-pyeong',
  '안양시': 'Anyang',
  '노원구': 'Nowon',
  '신안군': 'Sinan',
  '아산시': 'Asan',
  // 시/도 단위 (시/도 전체 데이터용)
  '경남': 'Gyeongsangnam-do',
  '충북': 'Chungcheongbuk-do',
  '광주': 'Gwangju',
};

interface KoreaMapProps {
  data: Client[];
  type: 'province' | 'municipality';
  colorScheme: 'indigo' | 'green';
  onRegionSelect?: (region: string, data: AggregatedData | null) => void;
  pocThreshold?: number;
  showPoc?: boolean;
}

export default function KoreaMap({ data, type, colorScheme, onRegionSelect, pocThreshold = 100000, showPoc = true }: KoreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const drawMap = async () => {
      setLoading(true);
      setError(null);

      const container = d3.select(containerRef.current);
      container.selectAll('svg').remove();

      const width = containerRef.current!.getBoundingClientRect().width;
      const height = width * 1.3;

      const svg = container
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', 'auto');

      try {
        // GeoJSON URL 사용
        const url = type === 'province'
          ? 'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-provinces-geo.json'
          : 'https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-municipalities-geo.json';

        const geojson = await d3.json<GeoJSON.FeatureCollection>(url);
        if (!geojson) throw new Error('Failed to load map data');

        const projection = d3.geoMercator()
          .fitSize([width - 40, height - 40], geojson);

        const path = d3.geoPath().projection(projection);

        // 데이터 집계
        const aggregated: Record<string, AggregatedData> = {};
        data.forEach(item => {
          const key = type === 'province' ? item.region : (item.subRegion || item.region);
          if (!key) return;
          if (!aggregated[key]) {
            aggregated[key] = { charge: 0, usage: 0, items: [] };
          }
          aggregated[key].charge += item.charge;
          aggregated[key].usage += item.usage;
          aggregated[key].items.push(item);
        });

        const maxCharge = Math.max(
          ...Object.values(aggregated).map(r => r.charge),
          type === 'province' ? 100000000 : 10000000
        );

        const colorScale = d3.scaleLinear<string>()
          .domain([0, maxCharge])
          .range(colorScheme === 'indigo' ? ['#e0e7ff', '#4f46e5'] : ['#d1fae5', '#059669']);

        // 영어명을 한글명으로 변환
        const toKoreanName = (name: string): string => {
          return REGION_EN_TO_KR[name] || name;
        };

        // GeoJSON에서 지역명 추출
        const getRegionName = (d: GeoJSON.Feature): string => {
          if (type === 'municipality') {
            return (d.properties?.NAME_2 || d.properties?.name || d.properties?.NAME || '') as string;
          }
          return (d.properties?.NAME_1 || d.properties?.name || d.properties?.NAME || '') as string;
        };

        // 시/도 지역명 매칭 함수
        const findProvinceData = (name: string): { key: string; data: AggregatedData; koreanName: string } | null => {
          const koreanName = toKoreanName(name);

          if (aggregated[koreanName]) {
            return { key: koreanName, data: aggregated[koreanName], koreanName };
          }

          // 부분 매칭
          const matchKey = Object.keys(aggregated).find(key => {
            const cleanName = koreanName.replace(/특별시|광역시|특별자치시|특별자치도|도/g, '').trim();
            const cleanKey = key.replace(/특별시|광역시|특별자치시|특별자치도|도/g, '').trim();
            return cleanName === cleanKey || cleanName.includes(cleanKey) || cleanKey.includes(cleanName);
          });

          return matchKey ? { key: matchKey, data: aggregated[matchKey], koreanName } : null;
        };

        // 지도 배경 그룹과 레이블/마커 그룹 분리
        const mapGroup = svg.append('g').attr('class', 'map-background');
        const labelGroup = svg.append('g').attr('class', 'labels');

        if (type === 'province') {
          // === 시/도 지도: 색상으로 데이터 표시 ===
          mapGroup.selectAll('path')
            .data(geojson.features)
            .enter()
            .append('path')
            .attr('d', d => path(d) || '')
            .attr('fill', (d) => {
              const name = getRegionName(d);
              const match = findProvinceData(name);
              if (!match) return '#f1f5f9';
              // PoC 데이터는 회색으로 표시
              if (match.data.charge < pocThreshold) return '#cbd5e1';
              return colorScale(match.data.charge);
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .style('transition', 'fill 0.15s')
            .on('mouseenter', function(event, d) {
              d3.select(this).attr('stroke', '#333').attr('stroke-width', 1.5);
              const name = getRegionName(d);
              const match = findProvinceData(name);
              const displayName = match?.koreanName || toKoreanName(name);

              if (tooltipRef.current) {
                const isPoc = match && match.data.charge < pocThreshold;
                tooltipRef.current.innerHTML = `
                  <div class="font-bold text-sm mb-1">${displayName} ${isPoc ? '<span class="text-xs font-normal text-amber-400">(PoC)</span>' : ''}</div>
                  <div class="text-xs text-slate-300">
                    ${match ? `
                      사용금액: ${formatMoney(match.data.charge)}<br/>
                      사용량: ${match.data.usage.toLocaleString()}<br/>
                      ${match.data.items.length > 0 ? `<br/>📍 ${match.data.items.slice(0, 3).map(i => i.name).join(', ')}${match.data.items.length > 3 ? ` 외 ${match.data.items.length - 3}개` : ''}` : ''}
                    ` : '데이터 없음'}
                  </div>
                `;
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
              d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
              if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
            })
            .on('click', function(event, d) {
              const name = getRegionName(d);
              const match = findProvinceData(name);
              onRegionSelect?.(match?.koreanName || toKoreanName(name), match?.data || null);
            });

          // 시/도 레이블 (별도 그룹에 추가하여 항상 위에 표시)
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
            .style('pointer-events', 'none')
            .text(d => {
              const koreanName = toKoreanName(getRegionName(d));
              return koreanName.replace(/특별시|광역시|특별자치시|특별자치도|도/g, '');
            });

        } else {
          // === 시/군/구 지도: 영역 색상으로 표시 ===

          // 시/군/구 매칭 함수
          const findMunicipalityData = (name2: string, name1: string): { key: string; data: AggregatedData; koreanName: string } | null => {
            // NAME_2(영어)를 한글로 변환
            const koreanName2 = Object.entries(REGION_KR_TO_EN).find(([kr, en]) => en === name2)?.[0] || name2;

            // 정확한 매칭
            if (aggregated[koreanName2]) {
              return { key: koreanName2, data: aggregated[koreanName2], koreanName: koreanName2 };
            }

            // 부분 매칭 (시/군/구 이름)
            const matchKey = Object.keys(aggregated).find(key => {
              const cleanKey = key.replace(/시|군|구/g, '').trim();
              const cleanName = koreanName2.replace(/시|군|구/g, '').trim();
              return cleanKey === cleanName || cleanKey.includes(cleanName) || cleanName.includes(cleanKey);
            });

            return matchKey ? { key: matchKey, data: aggregated[matchKey], koreanName: koreanName2 } : null;
          };

          // 지도 그리기
          mapGroup.selectAll('path')
            .data(geojson.features)
            .enter()
            .append('path')
            .attr('d', d => path(d) || '')
            .attr('fill', (d) => {
              const name2 = (d.properties?.NAME_2 || '') as string;
              const name1 = (d.properties?.NAME_1 || '') as string;
              const match = findMunicipalityData(name2, name1);
              if (!match) return '#f1f5f9';
              // PoC 데이터는 회색으로 표시
              if (match.data.charge < pocThreshold) return '#cbd5e1';
              return colorScale(match.data.charge);
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.3)
            .style('cursor', 'pointer')
            .style('transition', 'fill 0.15s')
            .on('mouseenter', function(event, d) {
              d3.select(this).attr('stroke', '#333').attr('stroke-width', 1);
              const name2 = (d.properties?.NAME_2 || '') as string;
              const name1 = (d.properties?.NAME_1 || '') as string;
              const match = findMunicipalityData(name2, name1);
              const koreanName2 = Object.entries(REGION_KR_TO_EN).find(([kr, en]) => en === name2)?.[0] || name2;
              const koreanName1 = toKoreanName(name1);

              if (tooltipRef.current) {
                const isPoc = match && match.data.charge < pocThreshold;
                tooltipRef.current.innerHTML = `
                  <div class="font-bold text-sm mb-1">${koreanName2} ${isPoc ? '<span class="text-xs font-normal text-amber-400">(PoC)</span>' : ''}<span class="font-normal text-slate-400"> (${koreanName1})</span></div>
                  <div class="text-xs text-slate-300">
                    ${match ? `
                      사용금액: ${formatMoney(match.data.charge)}<br/>
                      사용량: ${match.data.usage.toLocaleString()}<br/>
                      ${match.data.items.length > 0 ? `<br/>📍 ${match.data.items.slice(0, 3).map(i => i.name).join(', ')}${match.data.items.length > 3 ? ` 외 ${match.data.items.length - 3}개` : ''}` : ''}
                    ` : '데이터 없음'}
                  </div>
                `;
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
              d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.3);
              if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
            })
            .on('click', function(event, d) {
              const name2 = (d.properties?.NAME_2 || '') as string;
              const name1 = (d.properties?.NAME_1 || '') as string;
              const match = findMunicipalityData(name2, name1);
              const koreanName2 = Object.entries(REGION_KR_TO_EN).find(([kr, en]) => en === name2)?.[0] || name2;
              onRegionSelect?.(koreanName2, match?.data || null);
            });
        }

        setLoading(false);
      } catch (err) {
        console.error('Map error:', err);
        setError('지도를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    };

    drawMap();
  }, [data, type, colorScheme, onRegionSelect, pocThreshold, showPoc]);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            지도를 불러오는 중...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500">
            {error}
          </div>
        )}
      </div>
      <div
        ref={tooltipRef}
        className="fixed bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl z-50 pointer-events-none opacity-0 transition-opacity max-w-[280px]"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
