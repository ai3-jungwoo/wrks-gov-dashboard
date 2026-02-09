'use client';

/**
 * 공공 고객사 대시보드 메인 페이지
 *
 * 5개 카테고리(교육청, 지자체, 중앙행정기관, 공공기관, 민간/대학)별로
 * 고객사 데이터를 시각화합니다.
 *
 * @page
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  educationData,
  localGovData,
  centralGovData,
  publicInstitutionData,
  provinceGovData,
  privateData,
  universityData,
  formatMoney,
  AggregatedData,
  Client,
  ContractInfo,
  ContractChannel,
  PaymentMethod,
  BillingType,
  CONTRACT_CHANNEL_LABELS,
  PAYMENT_METHOD_LABELS,
  BILLING_TYPE_LABELS,
  CONTRACT_CHANNEL_COLORS,
  PAYMENT_METHOD_COLORS,
  BILLING_TYPE_COLORS,
  CONTRACT_CHANNEL_DESC,
  PAYMENT_METHOD_DESC,
  BILLING_TYPE_DESC,
} from '@/data/clients';

// ============================================================================
// 동적 임포트 (SSR 비활성화)
// ============================================================================

const KoreaMap = dynamic(() => import('@/components/KoreaMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center text-slate-500">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        <span>지도 로딩중...</span>
      </div>
    </div>
  ),
});

// ============================================================================
// 타입 정의
// ============================================================================

type TabType = 'education' | 'local' | 'central' | 'public' | 'private';

interface TabConfig {
  label: string;
  icon: string;
  data: Client[];
  hasMap: boolean;
  mapType?: 'province' | 'municipality';
  colorScheme: 'indigo' | 'green' | 'blue' | 'purple' | 'amber';
  colorClass: {
    active: string;
    text: string;
    border: string;
    bg: string;
  };
}

// ============================================================================
// 상수 정의
// ============================================================================

/** PoC 판단 기준 금액 (10만원) */
const POC_THRESHOLD = 100000;

/** 로컬 스토리지 키 */
const STORAGE_KEY = 'gov-dashboard-contract-types';

/** 탭 설정 */
const TAB_CONFIG: Record<TabType, TabConfig> = {
  education: {
    label: '교육청',
    icon: '📚',
    data: educationData,
    hasMap: true,
    mapType: 'province',
    colorScheme: 'indigo',
    colorClass: {
      active: 'border-indigo-300 bg-indigo-50 text-indigo-700',
      text: 'text-indigo-600',
      border: 'border-l-indigo-500',
      bg: 'bg-indigo-50',
    },
  },
  local: {
    label: '지자체',
    icon: '🏛️',
    data: localGovData,
    hasMap: true,
    mapType: 'municipality',
    colorScheme: 'green',
    colorClass: {
      active: 'border-emerald-300 bg-emerald-50 text-emerald-700',
      text: 'text-emerald-600',
      border: 'border-l-emerald-500',
      bg: 'bg-emerald-50',
    },
  },
  central: {
    label: '중앙행정기관',
    icon: '🏢',
    data: centralGovData,
    hasMap: false,
    colorScheme: 'blue',
    colorClass: {
      active: 'border-blue-300 bg-blue-50 text-blue-700',
      text: 'text-blue-600',
      border: 'border-l-blue-500',
      bg: 'bg-blue-50',
    },
  },
  public: {
    label: '공공기관',
    icon: '🏗️',
    data: [...publicInstitutionData, ...provinceGovData],
    hasMap: false,
    colorScheme: 'purple',
    colorClass: {
      active: 'border-purple-300 bg-purple-50 text-purple-700',
      text: 'text-purple-600',
      border: 'border-l-purple-500',
      bg: 'bg-purple-50',
    },
  },
  private: {
    label: '민간/대학',
    icon: '🏫',
    data: [...privateData, ...universityData],
    hasMap: false,
    colorScheme: 'amber',
    colorClass: {
      active: 'border-amber-300 bg-amber-50 text-amber-700',
      text: 'text-amber-600',
      border: 'border-l-amber-500',
      bg: 'bg-amber-50',
    },
  },
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function Home() {
  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [activeTab, setActiveTab] = useState<TabType>('education');
  const [selectedRegion, setSelectedRegion] = useState<{
    name: string;
    data: AggregatedData | null;
  } | null>(null);
  const [showPoc, setShowPoc] = useState(true);

  // 계약 정보 수정용 상태
  const [contractInfos, setContractInfos] = useState<Record<string, ContractInfo>>({});
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // ============================================================================
  // 로컬 스토리지 동기화
  // ============================================================================

  // 초기 로드: 로컬 스토리지에서 계약 정보 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setContractInfos(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('로컬 스토리지에서 계약 정보를 불러오는데 실패했습니다:', e);
    }
  }, []);

  // 계약 정보 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (Object.keys(contractInfos).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contractInfos));
      } catch (e) {
        console.warn('로컬 스토리지에 저장하는데 실패했습니다:', e);
      }
    }
  }, [contractInfos]);

  // ============================================================================
  // 현재 탭 설정
  // ============================================================================

  const config = TAB_CONFIG[activeTab];

  // ============================================================================
  // 메모이제이션된 계산
  // ============================================================================

  /**
   * PoC 필터가 적용된 데이터
   */
  const filteredData = useMemo(() => {
    return showPoc
      ? config.data
      : config.data.filter((item) => item.charge >= POC_THRESHOLD);
  }, [config.data, showPoc]);

  /**
   * 정렬된 데이터 (사용금액 순)
   */
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => b.charge - a.charge);
  }, [filteredData]);

  /**
   * PoC 고객사 수
   */
  const pocCount = useMemo(() => {
    return config.data.filter((item) => item.charge < POC_THRESHOLD).length;
  }, [config.data]);

  /**
   * 통계 계산
   */
  const stats = useMemo(() => {
    const totalCharge = filteredData.reduce((sum, item) => sum + item.charge, 0);
    const totalUsage = filteredData.reduce((sum, item) => sum + item.usage, 0);

    // 교육청 전용 지표
    const totalActiveUsers = filteredData.reduce(
      (sum, item) => sum + (item.activeUsers || 0),
      0
    );
    const totalTotalUsers = filteredData.reduce(
      (sum, item) => sum + (item.totalUsers || 0),
      0
    );
    const overallActivationRate =
      totalTotalUsers > 0
        ? ((totalActiveUsers / totalTotalUsers) * 100).toFixed(1)
        : null;
    const avgPricePerTotalUser =
      totalTotalUsers > 0 ? Math.round(totalCharge / totalTotalUsers) : null;
    const avgPricePerActiveUser =
      totalActiveUsers > 0 ? Math.round(totalCharge / totalActiveUsers) : null;

    return {
      totalCharge,
      totalUsage,
      totalActiveUsers,
      totalTotalUsers,
      overallActivationRate,
      avgPricePerTotalUser,
      avgPricePerActiveUser,
    };
  }, [filteredData]);

  // ============================================================================
  // 이벤트 핸들러
  // ============================================================================

  /**
   * 탭 변경 핸들러
   */
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSelectedRegion(null);
  }, []);

  /**
   * 지역 선택 핸들러
   */
  const handleRegionSelect = useCallback(
    (region: string, data: AggregatedData | null) => {
      setSelectedRegion({ name: region, data });
    },
    []
  );

  /**
   * PoC 토글 핸들러
   */
  const handleTogglePoc = useCallback(() => {
    setShowPoc((prev) => !prev);
  }, []);

  /**
   * 계약 정보 변경 핸들러
   */
  const handleContractInfoChange = useCallback(
    (clientName: string, info: ContractInfo | null) => {
      setContractInfos((prev) => {
        if (info === null) {
          // 삭제
          const next = { ...prev };
          delete next[clientName];
          return next;
        }
        return { ...prev, [clientName]: info };
      });
      setEditingClient(null);
    },
    []
  );

  /**
   * 고객 항목에서 계약 정보 가져오기
   */
  const getContractInfo = useCallback(
    (clientName: string): ContractInfo | undefined => {
      return contractInfos[clientName];
    },
    [contractInfos]
  );

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ================================================================== */}
      {/* Header */}
      {/* ================================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              W
            </div>
            <span className="font-bold text-lg tracking-tight">
              Wrks<span className="text-indigo-600">.ai</span>
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            공공 고객사 대시보드
          </span>
        </div>
      </header>

      {/* ================================================================== */}
      {/* Hero */}
      {/* ================================================================== */}
      <section className="bg-white border-b border-slate-100 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">
            공공 고객사 대시보드
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            2026년 1월 기준 · AI 서비스 활용 현황
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Main */}
      {/* ================================================================== */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ============================================================== */}
        {/* Tabs */}
        {/* ============================================================== */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => {
            const tabConfig = TAB_CONFIG[tab];
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all border-2 ${
                  activeTab === tab
                    ? tabConfig.colorClass.active
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <span>{tabConfig.icon}</span>
                {tabConfig.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab ? 'bg-white/50' : 'bg-slate-100'
                  }`}
                >
                  {tabConfig.data.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* PoC Filter & Summary */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between mb-6 bg-white border border-slate-200 rounded-xl p-4 flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            {/* 총 사용금액 */}
            <div>
              <div className="text-xs text-slate-400">총 사용금액</div>
              <div className={`text-lg font-bold ${config.colorClass.text}`}>
                {formatMoney(stats.totalCharge)}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200" />

            {/* 총 사용량 */}
            <div>
              <div className="text-xs text-slate-400">총 사용량</div>
              <div className={`text-lg font-bold ${config.colorClass.text}`}>
                {stats.totalUsage.toLocaleString()}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200" />

            {/* 고객사 수 */}
            <div>
              <div className="text-xs text-slate-400">고객사 수</div>
              <div className={`text-lg font-bold ${config.colorClass.text}`}>
                {filteredData.length}개
              </div>
            </div>

            {/* 교육청 전용 지표 */}
            {activeTab === 'education' && stats.totalActiveUsers > 0 && (
              <>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <div className="text-xs text-slate-400">활성/전체 가입자</div>
                  <div className="text-lg font-bold text-green-600">
                    {stats.totalActiveUsers.toLocaleString()} /{' '}
                    {stats.totalTotalUsers.toLocaleString()}명
                    {stats.overallActivationRate && (
                      <span className="text-sm ml-1">
                        ({stats.overallActivationRate}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <div className="text-xs text-slate-400">월평균 가격</div>
                  <div className="text-sm">
                    <span className="font-bold text-purple-600">
                      {stats.avgPricePerTotalUser
                        ? formatMoney(stats.avgPricePerTotalUser)
                        : '-'}
                    </span>
                    <span className="text-slate-400">/전체 · </span>
                    <span className="font-bold text-amber-600">
                      {stats.avgPricePerActiveUser
                        ? formatMoney(stats.avgPricePerActiveUser)
                        : '-'}
                    </span>
                    <span className="text-slate-400">/활성</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* PoC Filter Toggle */}
          <button
            onClick={handleTogglePoc}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showPoc
                ? 'bg-slate-100 text-slate-600'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <div
              className={`w-8 h-5 rounded-full relative transition-all ${
                showPoc ? 'bg-slate-300' : 'bg-amber-400'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  showPoc ? 'left-0.5' : 'left-3.5'
                }`}
              />
            </div>
            <span>PoC 제외</span>
            {pocCount > 0 && (
              <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded">
                {pocCount}건
              </span>
            )}
          </button>
        </div>

        {/* ============================================================== */}
        {/* Content */}
        {/* ============================================================== */}
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* ============================================================ */}
          {/* Map or List */}
          {/* ============================================================ */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <span>{config.icon}</span>
              {config.label} 현황
              {config.hasMap && (
                <span className="text-xs font-normal text-slate-400">
                  ({config.mapType === 'province' ? '시/도 단위' : '시/군/구 단위'})
                </span>
              )}
            </h2>

            {config.hasMap ? (
              <>
                <KoreaMap
                  data={filteredData}
                  type={config.mapType!}
                  colorScheme={config.colorScheme as 'indigo' | 'green'}
                  onRegionSelect={handleRegionSelect}
                  pocThreshold={POC_THRESHOLD}
                  showPoc={showPoc}
                />

                {/* Legend */}
                <div className="mt-5 p-4 bg-slate-50 rounded-lg">
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    사용금액 기준
                  </div>
                  <div
                    className="h-3 rounded-full"
                    style={{
                      background:
                        config.colorScheme === 'indigo'
                          ? 'linear-gradient(to right, #e0e7ff, #4f46e5)'
                          : 'linear-gradient(to right, #d1fae5, #059669)',
                    }}
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-400">
                    <span>0원</span>
                    <span>
                      {config.mapType === 'province' ? '1억원+' : '1천만원+'}
                    </span>
                  </div>
                  {showPoc && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-3 h-3 rounded bg-slate-300 border border-dashed border-slate-400" />
                      <span>PoC (10만원 미만)</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Card Grid for non-map tabs */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                {sortedData.map((item, idx) => (
                  <ClientCard
                    key={idx}
                    item={item}
                    isPoc={item.charge < POC_THRESHOLD}
                    colorClass={config.colorClass}
                    contractInfo={getContractInfo(item.name)}
                    onEditContract={() => setEditingClient(item)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* Panel */}
          {/* ============================================================ */}
          <div className="lg:w-[360px] bg-white border border-slate-200 rounded-2xl p-6">
            {/* Selected Region */}
            {selectedRegion && selectedRegion.data && (
              <div className={`mb-4 p-4 rounded-xl ${config.colorClass.bg}`}>
                <div
                  className={`font-bold ${config.colorClass.text.replace(
                    '600',
                    '700'
                  )}`}
                >
                  {selectedRegion.name}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  사용금액: {formatMoney(selectedRegion.data.charge)} ·{' '}
                  {selectedRegion.data.items.length}개 기관
                </div>
              </div>
            )}

            <h3 className="text-sm font-semibold text-slate-500 mb-4">
              📊 {config.label} 목록 (사용금액순)
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {sortedData.map((item, idx) => (
                <ClientItem
                  key={idx}
                  item={item}
                  isActive={
                    selectedRegion?.data?.items.some(
                      (i) => i.name === item.name
                    ) || false
                  }
                  isPoc={item.charge < POC_THRESHOLD}
                  colorClass={config.colorClass}
                  showUserMetrics={activeTab === 'education'}
                  contractInfo={getContractInfo(item.name)}
                  onEditContract={() => setEditingClient(item)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ================================================================== */}
      {/* Footer */}
      {/* ================================================================== */}
      <footer className="border-t border-slate-200 bg-white mt-8 py-5 text-center">
        <p className="text-xs text-slate-400">
          데이터 출처 · Wrks.ai 내부 고객 DB | 금액 단위: 원 | PoC 기준: 10만원
          미만
        </p>
      </footer>

      {/* ================================================================== */}
      {/* 계약 정보 편집 모달 */}
      {/* ================================================================== */}
      {editingClient && (
        <ContractInfoModal
          client={editingClient}
          currentInfo={getContractInfo(editingClient.name)}
          onSave={(info) => handleContractInfoChange(editingClient.name, info)}
          onClose={() => setEditingClient(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// 서브 컴포넌트: ClientCard (카드 그리드용)
// ============================================================================

interface ClientCardProps {
  item: Client;
  isPoc: boolean;
  colorClass: { text: string; bg: string };
  contractInfo?: ContractInfo;
  onEditContract: () => void;
}

function ClientCard({
  item,
  isPoc,
  colorClass,
  contractInfo,
  onEditContract,
}: ClientCardProps) {
  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        isPoc
          ? 'border-dashed border-slate-200 bg-slate-50'
          : `border-slate-100 ${colorClass.bg}`
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-800">{item.name}</div>
          {item.region && (
            <div className="text-xs text-slate-500 mt-0.5">
              {item.region}{' '}
              {item.subRegion && item.subRegion !== item.region
                ? `· ${item.subRegion}`
                : ''}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {isPoc && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
              PoC
            </span>
          )}
        </div>
      </div>

      {/* 계약 정보 태그들 */}
      <div className="flex flex-wrap gap-1 mt-2">
        <ContractInfoTags info={contractInfo} onEdit={onEditContract} />
      </div>

      <div className="flex gap-4 mt-3 text-sm">
        <div>
          <span className="text-slate-400">사용금액</span>
          <span className={`ml-2 font-bold ${colorClass.text}`}>
            {formatMoney(item.charge)}
          </span>
        </div>
        <div>
          <span className="text-slate-400">사용량</span>
          <span className={`ml-2 font-bold ${colorClass.text}`}>
            {item.usage.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 서브 컴포넌트: ClientItem (목록용)
// ============================================================================

interface ClientItemProps {
  item: Client;
  isActive: boolean;
  isPoc: boolean;
  colorClass: { text: string; border: string; bg: string };
  showUserMetrics?: boolean;
  contractInfo?: ContractInfo;
  onEditContract: () => void;
}

function ClientItem({
  item,
  isActive,
  isPoc,
  colorClass,
  showUserMetrics = false,
  contractInfo,
  onEditContract,
}: ClientItemProps) {
  // 교육청 지표 계산
  const activationRate =
    item.activeUsers && item.totalUsers
      ? ((item.activeUsers / item.totalUsers) * 100).toFixed(1)
      : null;
  const avgPricePerTotal = item.totalUsers
    ? Math.round(item.charge / item.totalUsers)
    : null;
  const avgPricePerActive = item.activeUsers
    ? Math.round(item.charge / item.activeUsers)
    : null;

  return (
    <div
      className={`p-3 rounded-lg border-l-4 transition-all ${
        isActive
          ? `${colorClass.bg} ${colorClass.border}`
          : isPoc
          ? 'bg-slate-50 border-l-slate-300 border-dashed'
          : 'bg-slate-50 border-l-slate-200 hover:bg-slate-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="font-semibold text-sm text-slate-800 flex-1">
          {item.name}
        </div>
        {isPoc && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
            PoC
          </span>
        )}
      </div>

      {/* 지역 정보 */}
      {item.region && (
        <div className="text-xs text-slate-500 mt-0.5">
          {item.region}{' '}
          {item.subRegion && item.subRegion !== item.region
            ? item.subRegion
            : ''}
        </div>
      )}

      {/* 계약 정보 태그들 */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        <ContractInfoTags info={contractInfo} onEdit={onEditContract} compact />
      </div>

      <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
        <span>
          사용금액:{' '}
          <strong className={colorClass.text}>{formatMoney(item.charge)}</strong>
        </span>
        <span>
          사용량:{' '}
          <strong className={colorClass.text}>
            {item.usage.toLocaleString()}
          </strong>
        </span>
      </div>

      {/* User Metrics for Education */}
      {showUserMetrics && (item.activeUsers || item.totalUsers) && (
        <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
          <div className="flex gap-3 text-xs text-slate-400">
            {item.activeUsers && (
              <span>
                활성:{' '}
                <strong className="text-indigo-600">
                  {item.activeUsers.toLocaleString()}명
                </strong>
              </span>
            )}
            {item.totalUsers && (
              <span>
                전체:{' '}
                <strong className="text-indigo-600">
                  {item.totalUsers.toLocaleString()}명
                </strong>
              </span>
            )}
            {activationRate && (
              <span>
                활성율: <strong className="text-green-600">{activationRate}%</strong>
              </span>
            )}
          </div>
          <div className="flex gap-3 text-xs text-slate-400">
            {avgPricePerTotal && (
              <span>
                월평균(전체):{' '}
                <strong className="text-purple-600">
                  {formatMoney(avgPricePerTotal)}/인
                </strong>
              </span>
            )}
            {avgPricePerActive && (
              <span>
                월평균(활성):{' '}
                <strong className="text-amber-600">
                  {formatMoney(avgPricePerActive)}/인
                </strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 서브 컴포넌트: ContractInfoTags (계약 정보 태그 표시)
// ============================================================================

interface ContractInfoTagsProps {
  info?: ContractInfo;
  onEdit: () => void;
  compact?: boolean;
}

function ContractInfoTags({ info, onEdit, compact = false }: ContractInfoTagsProps) {
  // 계약 정보가 없으면 추가 버튼만 표시
  if (!info || (!info.billing && !info.channel && !info.payment)) {
    return (
      <button
        onClick={onEdit}
        className="text-xs px-2 py-0.5 rounded border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 transition-all"
      >
        + 계약정보
      </button>
    );
  }

  return (
    <>
      {/* 과금 방식 (가장 중요!) */}
      {info.billing && (
        <button
          onClick={onEdit}
          className={`text-xs px-1.5 py-0.5 rounded border transition-all hover:opacity-80 ${
            BILLING_TYPE_COLORS[info.billing].bg
          } ${BILLING_TYPE_COLORS[info.billing].text} ${
            BILLING_TYPE_COLORS[info.billing].border
          }`}
        >
          {BILLING_TYPE_LABELS[info.billing]}
        </button>
      )}

      {/* 계약 채널 */}
      {info.channel && !compact && (
        <button
          onClick={onEdit}
          className={`text-xs px-1.5 py-0.5 rounded border transition-all hover:opacity-80 ${
            CONTRACT_CHANNEL_COLORS[info.channel].bg
          } ${CONTRACT_CHANNEL_COLORS[info.channel].text} ${
            CONTRACT_CHANNEL_COLORS[info.channel].border
          }`}
        >
          {CONTRACT_CHANNEL_LABELS[info.channel]}
        </button>
      )}

      {/* 정산 방식 */}
      {info.payment && !compact && (
        <button
          onClick={onEdit}
          className={`text-xs px-1.5 py-0.5 rounded border transition-all hover:opacity-80 ${
            PAYMENT_METHOD_COLORS[info.payment].bg
          } ${PAYMENT_METHOD_COLORS[info.payment].text} ${
            PAYMENT_METHOD_COLORS[info.payment].border
          }`}
        >
          {PAYMENT_METHOD_LABELS[info.payment]}
        </button>
      )}

      {/* compact 모드에서 추가 정보가 있으면 ... 표시 */}
      {compact && (info.channel || info.payment) && (
        <button
          onClick={onEdit}
          className="text-xs px-1 py-0.5 text-slate-400 hover:text-slate-600"
        >
          ...
        </button>
      )}
    </>
  );
}

// ============================================================================
// 서브 컴포넌트: ContractInfoModal (계약 정보 편집 모달)
// ============================================================================

interface ContractInfoModalProps {
  client: Client;
  currentInfo?: ContractInfo;
  onSave: (info: ContractInfo | null) => void;
  onClose: () => void;
}

function ContractInfoModal({
  client,
  currentInfo,
  onSave,
  onClose,
}: ContractInfoModalProps) {
  const [info, setInfo] = useState<ContractInfo>(currentInfo || {});

  const billingTypes: BillingType[] = ['usage', 'fixed', 'poc'];
  const channels: ContractChannel[] = [
    'naramarket_service',
    'naramarket_goods',
    'document',
    'simple',
  ];
  const payments: PaymentMethod[] = [
    'prepaid_card',
    'prepaid_cash',
    'postpaid_cash',
    'auto_card',
    'narabill',
  ];

  const handleSave = () => {
    // 하나라도 선택되어 있으면 저장
    if (info.billing || info.channel || info.payment) {
      onSave(info);
    } else {
      onSave(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-1">계약 정보 설정</h3>
        <p className="text-sm text-slate-500 mb-4">{client.name}</p>

        {/* 과금 방식 (가장 중요!) */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            💰 과금 방식
            <span className="text-xs font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              중요
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {billingTypes.map((type) => {
              const colors = BILLING_TYPE_COLORS[type];
              const isSelected = info.billing === type;
              return (
                <button
                  key={type}
                  onClick={() =>
                    setInfo((prev) => ({
                      ...prev,
                      billing: isSelected ? undefined : type,
                    }))
                  }
                  className={`p-2 rounded-lg border-2 text-center transition-all ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ${colors.text}`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {BILLING_TYPE_LABELS[type]}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {BILLING_TYPE_DESC[type]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 계약 채널 */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            📝 계약 채널
          </div>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((ch) => {
              const colors = CONTRACT_CHANNEL_COLORS[ch];
              const isSelected = info.channel === ch;
              return (
                <button
                  key={ch}
                  onClick={() =>
                    setInfo((prev) => ({
                      ...prev,
                      channel: isSelected ? undefined : ch,
                    }))
                  }
                  className={`p-2 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ${colors.text}`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {CONTRACT_CHANNEL_LABELS[ch]}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {CONTRACT_CHANNEL_DESC[ch]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 정산 방식 */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            💳 정산 방식
          </div>
          <div className="grid grid-cols-2 gap-2">
            {payments.map((pm) => {
              const colors = PAYMENT_METHOD_COLORS[pm];
              const isSelected = info.payment === pm;
              return (
                <button
                  key={pm}
                  onClick={() =>
                    setInfo((prev) => ({
                      ...prev,
                      payment: isSelected ? undefined : pm,
                    }))
                  }
                  className={`p-2 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ${colors.text}`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {PAYMENT_METHOD_LABELS[pm]}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {PAYMENT_METHOD_DESC[pm]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 메모 */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-slate-700 mb-2">
            📋 메모 (선택)
          </div>
          <input
            type="text"
            value={info.note || ''}
            onChange={(e) =>
              setInfo((prev) => ({ ...prev, note: e.target.value || undefined }))
            }
            placeholder="계약 관련 메모..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* 버튼들 */}
        <div className="flex gap-2">
          {currentInfo && (
            <button
              onClick={() => onSave(null)}
              className="flex-1 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              삭제
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 text-sm bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
