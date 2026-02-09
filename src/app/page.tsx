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
import {
  fetchAllData,
  saveContract,
  deleteContract,
  saveUserMetrics,
  deleteUserMetrics,
  UserMetrics,
} from '@/lib/googleSheets';

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

  // 사용자 지표 수정용 상태
  const [userMetrics, setUserMetrics] = useState<Record<string, UserMetrics>>({});
  const [editingUserMetrics, setEditingUserMetrics] = useState<Client | null>(null);

  // 로딩/저장 상태
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);

  // ============================================================================
  // Google Sheets 동기화
  // ============================================================================

  // 초기 로드: Google Sheets에서 데이터 불러오기
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAllData();
        setContractInfos(data.contracts);
        setUserMetrics(data.users);
      } catch (e) {
        console.error('Google Sheets에서 데이터를 불러오는데 실패했습니다:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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
   * 사용자 지표 가져오기 (로컬 스토리지 우선, 없으면 원본 데이터)
   */
  const getUserMetrics = useCallback(
    (clientName: string, item: Client): UserMetrics => {
      const stored = userMetrics[clientName];
      return {
        activeUsers: stored?.activeUsers ?? item.activeUsers,
        totalUsers: stored?.totalUsers ?? item.totalUsers,
      };
    },
    [userMetrics]
  );

  /**
   * 통계 계산 (로컬 스토리지 지표 포함)
   */
  const stats = useMemo(() => {
    const totalCharge = filteredData.reduce((sum, item) => sum + item.charge, 0);
    const totalUsage = filteredData.reduce((sum, item) => sum + item.usage, 0);

    // 사용자 지표 합계 (로컬 스토리지 값 우선)
    const totalActiveUsers = filteredData.reduce((sum, item) => {
      const metrics = getUserMetrics(item.name, item);
      return sum + (metrics.activeUsers || 0);
    }, 0);
    const totalTotalUsers = filteredData.reduce((sum, item) => {
      const metrics = getUserMetrics(item.name, item);
      return sum + (metrics.totalUsers || 0);
    }, 0);

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
  }, [filteredData, getUserMetrics]);

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
   * 계약 정보 변경 핸들러 (Google Sheets 저장)
   */
  const handleContractInfoChange = useCallback(
    async (clientName: string, info: ContractInfo | null) => {
      setIsSaving(true);
      try {
        if (info === null) {
          // 삭제
          await deleteContract(clientName);
          setContractInfos((prev) => {
            const next = { ...prev };
            delete next[clientName];
            return next;
          });
        } else {
          // 저장
          await saveContract(clientName, info);
          setContractInfos((prev) => ({ ...prev, [clientName]: info }));
        }
      } catch (e) {
        console.error('계약 정보 저장 실패:', e);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setIsSaving(false);
        setEditingClient(null);
      }
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

  /**
   * 기존 데이터를 Google Sheets로 마이그레이션
   */
  const handleMigrateToSheets = useCallback(async () => {
    if (!confirm('기존 교육청 사용자 데이터를 Google Sheets로 내보내시겠습니까?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationLog([]);

    const allData = [
      ...educationData,
      ...localGovData,
      ...centralGovData,
      ...publicInstitutionData,
      ...provinceGovData,
      ...privateData,
      ...universityData,
    ];

    // 사용자 지표가 있는 항목만 필터
    const dataWithMetrics = allData.filter(
      (item) => item.activeUsers !== undefined || item.totalUsers !== undefined
    );

    let successCount = 0;
    let failCount = 0;

    for (const item of dataWithMetrics) {
      const metrics: UserMetrics = {};
      if (item.activeUsers) metrics.activeUsers = item.activeUsers;
      if (item.totalUsers) metrics.totalUsers = item.totalUsers;

      setMigrationLog((prev) => [
        ...prev,
        `📤 ${item.name}: 활성=${item.activeUsers ?? '-'}, 전체=${item.totalUsers ?? '-'}`,
      ]);

      try {
        const success = await saveUserMetrics(item.name, metrics);
        if (success) {
          setMigrationLog((prev) => [...prev, `   ✅ 저장 완료`]);
          successCount++;
        } else {
          setMigrationLog((prev) => [...prev, `   ❌ 저장 실패`]);
          failCount++;
        }
      } catch (e) {
        setMigrationLog((prev) => [...prev, `   ❌ 오류: ${e}`]);
        failCount++;
      }

      // API 호출 간격
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setMigrationLog((prev) => [
      ...prev,
      ``,
      `========================================`,
      `✅ 성공: ${successCount}건`,
      `❌ 실패: ${failCount}건`,
      `========================================`,
    ]);

    setIsMigrating(false);

    // 완료 후 데이터 새로고침
    if (successCount > 0) {
      const data = await fetchAllData();
      setContractInfos(data.contracts);
      setUserMetrics(data.users);
    }
  }, []);

  /**
   * 사용자 지표 변경 핸들러 (Google Sheets 저장)
   */
  const handleUserMetricsChange = useCallback(
    async (clientName: string, metrics: UserMetrics | null) => {
      setIsSaving(true);
      try {
        if (metrics === null) {
          // 삭제
          await deleteUserMetrics(clientName);
          setUserMetrics((prev) => {
            const next = { ...prev };
            delete next[clientName];
            return next;
          });
        } else {
          // 저장
          await saveUserMetrics(clientName, metrics);
          setUserMetrics((prev) => ({ ...prev, [clientName]: metrics }));
        }
      } catch (e) {
        console.error('사용자 지표 저장 실패:', e);
        alert('저장에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setIsSaving(false);
        setEditingUserMetrics(null);
      }
    },
    []
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
                    userMetrics={getUserMetrics(item.name, item)}
                    onEditUserMetrics={() => setEditingUserMetrics(item)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* Panel */}
          {/* ============================================================ */}
          <div className="lg:w-[400px] bg-white border border-slate-200 rounded-2xl p-6">
            {/* Selected Region - 상세 정보 */}
            {selectedRegion && selectedRegion.data && (
              <div className={`mb-5 p-4 rounded-xl border-2 ${config.colorClass.bg} ${config.colorClass.border.replace('border-l-', 'border-')}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-lg font-bold ${config.colorClass.text}`}>
                    📍 {selectedRegion.name}
                  </div>
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                  >
                    ✕
                  </button>
                </div>

                {/* 통계 그리드 */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white/60 rounded-lg p-2">
                    <div className="text-xs text-slate-500">사용금액</div>
                    <div className={`text-base font-bold ${config.colorClass.text}`}>
                      {formatMoney(selectedRegion.data.charge)}
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2">
                    <div className="text-xs text-slate-500">사용량</div>
                    <div className={`text-base font-bold ${config.colorClass.text}`}>
                      {selectedRegion.data.usage.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 소속 기관 목록 */}
                <div className="bg-white/60 rounded-lg p-2">
                  <div className="text-xs text-slate-500 mb-1">
                    소속 기관 ({selectedRegion.data.items.length}개)
                  </div>
                  <div className="space-y-1">
                    {selectedRegion.data.items
                      .sort((a, b) => b.charge - a.charge)
                      .map((org, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate flex-1">{org.name}</span>
                          <span className={`font-medium ${config.colorClass.text} ml-2`}>
                            {formatMoney(org.charge)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center justify-between">
              <span>📊 {config.label} 목록</span>
              <span className="text-xs font-normal text-slate-400">
                사용금액순 · {selectedRegion?.data ? selectedRegion.data.items.length : filteredData.length}개
                {selectedRegion?.data && (
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="ml-2 text-indigo-500 hover:text-indigo-700"
                  >
                    (전체보기)
                  </button>
                )}
              </span>
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(selectedRegion?.data
                ? selectedRegion.data.items.sort((a, b) => b.charge - a.charge)
                : sortedData
              ).map((item, idx) => (
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
                  contractInfo={getContractInfo(item.name)}
                  onEditContract={() => setEditingClient(item)}
                  userMetrics={getUserMetrics(item.name, item)}
                  onEditUserMetrics={() => setEditingUserMetrics(item)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ================================================================== */}
      {/* Footer */}
      {/* ================================================================== */}
      <footer className="border-t border-slate-200 bg-white mt-8 py-5">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-slate-400 text-center">
            데이터 출처 · Wrks.ai 내부 고객 DB | 금액 단위: 원 | PoC 기준: 10만원
            미만
          </p>

          {/* 관리자 도구 */}
          <details className="mt-4">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
              🔧 관리자 도구
            </summary>
            <div className="mt-3 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleMigrateToSheets}
                  disabled={isMigrating}
                  className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMigrating ? '마이그레이션 중...' : '📤 기존 데이터 → Google Sheets'}
                </button>
                <span className="text-xs text-slate-500">
                  교육청 등 기존 사용자 수 데이터를 Sheet로 내보냅니다
                </span>
              </div>

              {/* 마이그레이션 로그 */}
              {migrationLog.length > 0 && (
                <div className="mt-3 p-3 bg-slate-800 text-green-400 rounded font-mono text-xs max-h-60 overflow-y-auto">
                  {migrationLog.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </div>
      </footer>

      {/* ================================================================== */}
      {/* 초기 로딩 오버레이 */}
      {/* ================================================================== */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm text-slate-600">데이터 불러오는 중...</span>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 저장 중 인디케이터 */}
      {/* ================================================================== */}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-sm">저장 중...</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* 계약 정보 편집 모달 */}
      {/* ================================================================== */}
      {editingClient && (
        <ContractInfoModal
          client={editingClient}
          currentInfo={getContractInfo(editingClient.name)}
          onSave={(info) => handleContractInfoChange(editingClient.name, info)}
          onClose={() => setEditingClient(null)}
          isSaving={isSaving}
        />
      )}

      {/* ================================================================== */}
      {/* 사용자 지표 편집 모달 */}
      {/* ================================================================== */}
      {editingUserMetrics && (
        <UserMetricsModal
          client={editingUserMetrics}
          currentMetrics={getUserMetrics(editingUserMetrics.name, editingUserMetrics)}
          onSave={(metrics) => handleUserMetricsChange(editingUserMetrics.name, metrics)}
          onClose={() => setEditingUserMetrics(null)}
          isSaving={isSaving}
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
  userMetrics: UserMetrics;
  onEditUserMetrics: () => void;
}

function ClientCard({
  item,
  isPoc,
  colorClass,
  contractInfo,
  onEditContract,
  userMetrics,
  onEditUserMetrics,
}: ClientCardProps) {
  const { activeUsers, totalUsers } = userMetrics;
  const hasUserData = activeUsers !== undefined || totalUsers !== undefined;
  const activationRate =
    activeUsers && totalUsers
      ? ((activeUsers / totalUsers) * 100).toFixed(1)
      : null;
  const avgPricePerTotal = totalUsers
    ? Math.round(item.charge / totalUsers)
    : null;
  const avgPricePerActive = activeUsers
    ? Math.round(item.charge / activeUsers)
    : null;

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
        isPoc
          ? 'border-dashed border-slate-200 bg-slate-50/50'
          : `border-slate-100 ${colorClass.bg} hover:border-slate-200`
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 truncate">{item.name}</div>
          {item.region && (
            <div className="text-xs text-slate-400 mt-0.5">
              📍 {item.region}
              {item.subRegion && item.subRegion !== item.region
                ? ` · ${item.subRegion}`
                : ''}
            </div>
          )}
        </div>
        {isPoc && (
          <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
            PoC
          </span>
        )}
      </div>

      {/* 사용금액/사용량 - 그리드 */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-white/60 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-400">사용금액</div>
          <div className={`text-base font-bold ${colorClass.text}`}>
            {formatMoney(item.charge)}
          </div>
        </div>
        <div className="bg-white/60 rounded-lg px-3 py-2">
          <div className="text-xs text-slate-400">사용량</div>
          <div className={`text-base font-bold ${colorClass.text}`}>
            {item.usage.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 사용자 지표 */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        {hasUserData ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={onEditUserMetrics}
                className="bg-indigo-50 hover:bg-indigo-100 rounded px-2 py-1.5 text-center transition-colors"
              >
                <div className="text-xs text-indigo-400">활성</div>
                <div className="text-sm font-bold text-indigo-600">
                  {activeUsers?.toLocaleString() ?? '-'}
                </div>
              </button>
              <button
                onClick={onEditUserMetrics}
                className="bg-slate-50 hover:bg-slate-100 rounded px-2 py-1.5 text-center transition-colors"
              >
                <div className="text-xs text-slate-400">전체</div>
                <div className="text-sm font-bold text-slate-600">
                  {totalUsers?.toLocaleString() ?? '-'}
                </div>
              </button>
              <button
                onClick={onEditUserMetrics}
                className="bg-green-50 hover:bg-green-100 rounded px-2 py-1.5 text-center transition-colors"
              >
                <div className="text-xs text-green-400">활성율</div>
                <div className="text-sm font-bold text-green-600">
                  {activationRate ? `${activationRate}%` : '-'}
                </div>
              </button>
            </div>
            {(avgPricePerTotal || avgPricePerActive) && (
              <div className="grid grid-cols-2 gap-1">
                <div className="bg-purple-50 rounded px-2 py-1 text-center">
                  <div className="text-xs text-purple-400">월평균/전체</div>
                  <div className="text-xs font-bold text-purple-600">
                    {avgPricePerTotal ? formatMoney(avgPricePerTotal) : '-'}
                  </div>
                </div>
                <div className="bg-amber-50 rounded px-2 py-1 text-center">
                  <div className="text-xs text-amber-400">월평균/활성</div>
                  <div className="text-xs font-bold text-amber-600">
                    {avgPricePerActive ? formatMoney(avgPricePerActive) : '-'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onEditUserMetrics}
            className="w-full py-2 text-xs text-orange-500 bg-orange-50 hover:bg-orange-100 rounded-lg border border-dashed border-orange-200 transition-colors"
          >
            👥 사용자 수 입력필요
          </button>
        )}
      </div>

      {/* 계약 정보 태그들 */}
      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
        <ContractInfoTags info={contractInfo} onEdit={onEditContract} />
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
  contractInfo?: ContractInfo;
  onEditContract: () => void;
  userMetrics: UserMetrics;
  onEditUserMetrics: () => void;
}

function ClientItem({
  item,
  isActive,
  isPoc,
  colorClass,
  contractInfo,
  onEditContract,
  userMetrics,
  onEditUserMetrics,
}: ClientItemProps) {
  const { activeUsers, totalUsers } = userMetrics;
  const hasUserData = activeUsers !== undefined || totalUsers !== undefined;
  const activationRate =
    activeUsers && totalUsers
      ? ((activeUsers / totalUsers) * 100).toFixed(1)
      : null;
  const avgPricePerTotal = totalUsers
    ? Math.round(item.charge / totalUsers)
    : null;
  const avgPricePerActive = activeUsers
    ? Math.round(item.charge / activeUsers)
    : null;

  return (
    <div
      className={`p-3 rounded-xl border-2 transition-all ${
        isActive
          ? `${colorClass.bg} ${colorClass.border.replace('border-l-', 'border-')}`
          : isPoc
          ? 'bg-slate-50/50 border-dashed border-slate-200'
          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      {/* 헤더: 이름 + PoC 뱃지 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-800 truncate">
            {item.name}
          </div>
          {item.region && (
            <div className="text-xs text-slate-400 mt-0.5">
              📍 {item.region}
              {item.subRegion && item.subRegion !== item.region
                ? ` · ${item.subRegion}`
                : ''}
            </div>
          )}
        </div>
        {isPoc && (
          <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">
            PoC
          </span>
        )}
      </div>

      {/* 사용금액/사용량 - 그리드 레이아웃 */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="bg-slate-50 rounded-lg px-2 py-1.5">
          <div className="text-xs text-slate-400">사용금액</div>
          <div className={`text-sm font-bold ${colorClass.text}`}>
            {formatMoney(item.charge)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-2 py-1.5">
          <div className="text-xs text-slate-400">사용량</div>
          <div className={`text-sm font-bold ${colorClass.text}`}>
            {item.usage.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 사용자 지표 */}
      <div className="mt-2 pt-2 border-t border-slate-100">
        {hasUserData ? (
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-1 text-center">
              <button
                onClick={onEditUserMetrics}
                className="bg-indigo-50 hover:bg-indigo-100 rounded px-1 py-1 transition-colors"
              >
                <div className="text-xs text-indigo-400">활성</div>
                <div className="text-xs font-bold text-indigo-600">
                  {activeUsers?.toLocaleString() ?? '-'}
                </div>
              </button>
              <button
                onClick={onEditUserMetrics}
                className="bg-slate-50 hover:bg-slate-100 rounded px-1 py-1 transition-colors"
              >
                <div className="text-xs text-slate-400">전체</div>
                <div className="text-xs font-bold text-slate-600">
                  {totalUsers?.toLocaleString() ?? '-'}
                </div>
              </button>
              <button
                onClick={onEditUserMetrics}
                className="bg-green-50 hover:bg-green-100 rounded px-1 py-1 transition-colors"
              >
                <div className="text-xs text-green-400">활성율</div>
                <div className="text-xs font-bold text-green-600">
                  {activationRate ? `${activationRate}%` : '-'}
                </div>
              </button>
            </div>
            {(avgPricePerTotal || avgPricePerActive) && (
              <div className="grid grid-cols-2 gap-1 text-center">
                <div className="bg-purple-50 rounded px-1 py-0.5">
                  <div className="text-xs text-purple-400">월평균/전체</div>
                  <div className="text-xs font-bold text-purple-600">
                    {avgPricePerTotal ? formatMoney(avgPricePerTotal) : '-'}
                  </div>
                </div>
                <div className="bg-amber-50 rounded px-1 py-0.5">
                  <div className="text-xs text-amber-400">월평균/활성</div>
                  <div className="text-xs font-bold text-amber-600">
                    {avgPricePerActive ? formatMoney(avgPricePerActive) : '-'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onEditUserMetrics}
            className="w-full py-1.5 text-xs text-orange-500 bg-orange-50 hover:bg-orange-100 rounded border border-dashed border-orange-200 transition-colors"
          >
            👥 사용자 수 입력필요
          </button>
        )}
      </div>

      {/* 계약 정보 태그들 */}
      <div className="flex flex-wrap gap-1 mt-2">
        <ContractInfoTags info={contractInfo} onEdit={onEditContract} />
      </div>
    </div>
  );
}

// ============================================================================
// 서브 컴포넌트: ContractInfoTags (계약 정보 태그 표시)
// ============================================================================

interface ContractInfoTagsProps {
  info?: ContractInfo;
  onEdit: () => void;
}

function ContractInfoTags({ info, onEdit }: ContractInfoTagsProps) {
  // 계약 정보가 없으면 추가 버튼만 표시
  if (!info || (!info.billing && !info.channel && !info.payment)) {
    return (
      <button
        onClick={onEdit}
        className="text-xs px-2 py-0.5 rounded border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:bg-slate-50 transition-all"
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
      {info.channel && (
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
      {info.payment && (
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

      {/* 메모가 있으면 표시 */}
      {info.note && (
        <button
          onClick={onEdit}
          className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 hover:opacity-80 transition-all"
          title={info.note}
        >
          📝
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
  isSaving?: boolean;
}

function ContractInfoModal({
  client,
  currentInfo,
  onSave,
  onClose,
  isSaving = false,
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
              disabled={isSaving}
              className="flex-1 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              삭제
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 text-sm bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 서브 컴포넌트: UserMetricsModal (사용자 지표 편집 모달)
// ============================================================================

interface UserMetricsModalProps {
  client: Client;
  currentMetrics: UserMetrics;
  onSave: (metrics: UserMetrics | null) => void;
  onClose: () => void;
  isSaving?: boolean;
}

function UserMetricsModal({
  client,
  currentMetrics,
  onSave,
  onClose,
  isSaving = false,
}: UserMetricsModalProps) {
  const [activeUsers, setActiveUsers] = useState<string>(
    currentMetrics.activeUsers?.toString() || ''
  );
  const [totalUsers, setTotalUsers] = useState<string>(
    currentMetrics.totalUsers?.toString() || ''
  );

  // 계산된 지표
  const activeNum = activeUsers ? parseInt(activeUsers, 10) : undefined;
  const totalNum = totalUsers ? parseInt(totalUsers, 10) : undefined;
  const activationRate =
    activeNum && totalNum ? ((activeNum / totalNum) * 100).toFixed(1) : null;
  const avgPricePerTotal = totalNum
    ? Math.round(client.charge / totalNum)
    : null;
  const avgPricePerActive = activeNum
    ? Math.round(client.charge / activeNum)
    : null;

  const handleSave = () => {
    const metrics: UserMetrics = {};
    if (activeUsers) metrics.activeUsers = parseInt(activeUsers, 10);
    if (totalUsers) metrics.totalUsers = parseInt(totalUsers, 10);

    if (Object.keys(metrics).length > 0) {
      onSave(metrics);
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
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-1">👥 사용자 수 입력</h3>
        <p className="text-sm text-slate-500 mb-4">{client.name}</p>

        {/* 입력 필드 */}
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              활성 사용자수
            </label>
            <input
              type="number"
              value={activeUsers}
              onChange={(e) => setActiveUsers(e.target.value)}
              placeholder="예: 1000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              전체 사용자수 (가입자)
            </label>
            <input
              type="number"
              value={totalUsers}
              onChange={(e) => setTotalUsers(e.target.value)}
              placeholder="예: 5000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* 계산된 지표 미리보기 */}
        {(activeNum || totalNum) && (
          <div className="mb-5 p-3 bg-slate-50 rounded-lg">
            <div className="text-xs font-semibold text-slate-500 mb-2">
              📊 계산된 지표
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {activationRate && (
                <div className="bg-green-50 rounded p-2">
                  <div className="text-xs text-green-500">활성율</div>
                  <div className="text-sm font-bold text-green-600">
                    {activationRate}%
                  </div>
                </div>
              )}
              {avgPricePerTotal && (
                <div className="bg-purple-50 rounded p-2">
                  <div className="text-xs text-purple-500">월평균/전체</div>
                  <div className="text-sm font-bold text-purple-600">
                    {formatMoney(avgPricePerTotal)}
                  </div>
                </div>
              )}
              {avgPricePerActive && (
                <div className="bg-amber-50 rounded p-2">
                  <div className="text-xs text-amber-500">월평균/활성</div>
                  <div className="text-sm font-bold text-amber-600">
                    {formatMoney(avgPricePerActive)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 버튼들 */}
        <div className="flex gap-2">
          {(currentMetrics.activeUsers || currentMetrics.totalUsers) && (
            <button
              onClick={() => onSave(null)}
              disabled={isSaving}
              className="flex-1 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              삭제
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
