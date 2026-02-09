/**
 * Google Sheets API 연동
 *
 * 계약 정보와 사용자 지표를 Google Sheets에 저장/불러오기
 *
 * Google Apps Script는 CORS 제한이 있어서 특별한 방식으로 호출해야 함
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwzFO4EoVbDWBxqT98RN0i9L_xulxECBf80t5wii1HJH0StCl8YRDCfeGr82ldBgW6Brw/exec';

import { ContractInfo } from '@/data/clients';

export interface UserMetrics {
  activeUsers?: number;
  totalUsers?: number;
}

export interface SheetData {
  contracts: Record<string, ContractInfo>;
  users: Record<string, UserMetrics>;
}

/**
 * Google Apps Script API 호출 (CORS 우회)
 */
async function callAPI(params: Record<string, string>): Promise<Record<string, unknown>> {
  // URL 파라미터로 전송 (CORS preflight 방지)
  const searchParams = new URLSearchParams(params);
  const url = `${API_URL}?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });

    const text = await response.text();

    // HTML 응답인지 확인 (로그인 리다이렉트)
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<HTML')) {
      console.error('Google 로그인이 필요합니다. 응답:', text.substring(0, 200));
      throw new Error('Google 로그인이 필요합니다');
    }

    try {
      return JSON.parse(text);
    } catch {
      console.error('JSON 파싱 실패:', text.substring(0, 500));
      throw new Error('잘못된 응답 형식');
    }
  } catch (error) {
    console.error('API 호출 실패:', error);
    throw error;
  }
}

/**
 * 모든 데이터 불러오기
 */
export async function fetchAllData(): Promise<SheetData> {
  try {
    const data = await callAPI({ action: 'getAll' });

    // 숫자 변환 (Sheets에서 문자열로 올 수 있음)
    const users: Record<string, UserMetrics> = {};
    if (data.users && typeof data.users === 'object') {
      for (const [key, value] of Object.entries(data.users as Record<string, Record<string, unknown>>)) {
        users[key] = {
          activeUsers: value.activeUsers ? Number(value.activeUsers) : undefined,
          totalUsers: value.totalUsers ? Number(value.totalUsers) : undefined,
        };
      }
    }

    return {
      contracts: (data.contracts as Record<string, ContractInfo>) || {},
      users,
    };
  } catch (error) {
    console.error('Google Sheets 데이터 불러오기 실패:', error);
    return { contracts: {}, users: {} };
  }
}

/**
 * 계약 정보 저장
 */
export async function saveContract(
  clientName: string,
  info: ContractInfo,
  updatedBy?: string
): Promise<boolean> {
  try {
    const result = await callAPI({
      action: 'saveContract',
      clientName,
      channel: info.channel || '',
      payment: info.payment || '',
      billing: info.billing || '',
      note: info.note || '',
      updatedBy: updatedBy || 'dashboard',
    });
    return result.success === true;
  } catch (error) {
    console.error('계약 정보 저장 실패:', error);
    return false;
  }
}

/**
 * 계약 정보 삭제
 */
export async function deleteContract(clientName: string): Promise<boolean> {
  try {
    const result = await callAPI({
      action: 'deleteContract',
      clientName,
    });
    return result.success === true;
  } catch (error) {
    console.error('계약 정보 삭제 실패:', error);
    return false;
  }
}

/**
 * 사용자 지표 저장
 */
export async function saveUserMetrics(
  clientName: string,
  metrics: UserMetrics,
  updatedBy?: string
): Promise<boolean> {
  try {
    const result = await callAPI({
      action: 'saveUsers',
      clientName,
      activeUsers: metrics.activeUsers?.toString() ?? '',
      totalUsers: metrics.totalUsers?.toString() ?? '',
      updatedBy: updatedBy || 'dashboard',
    });
    return result.success === true;
  } catch (error) {
    console.error('사용자 지표 저장 실패:', error);
    return false;
  }
}

/**
 * 사용자 지표 삭제
 */
export async function deleteUserMetrics(clientName: string): Promise<boolean> {
  try {
    const result = await callAPI({
      action: 'deleteUsers',
      clientName,
    });
    return result.success === true;
  } catch (error) {
    console.error('사용자 지표 삭제 실패:', error);
    return false;
  }
}
