/**
 * Google Sheets API 연동
 *
 * 계약 정보와 사용자 지표를 Google Sheets에 저장/불러오기
 */

const API_URL = 'https://script.google.com/a/macros/chainpartners.net/s/AKfycbwzFO4EoVbDWBxqT98RN0i9L_xulxECBf80t5wii1HJH0StCl8YRDCfeGr82ldBgW6Brw/exec';

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
 * 모든 데이터 불러오기
 */
export async function fetchAllData(): Promise<SheetData> {
  try {
    const response = await fetch(`${API_URL}?action=getAll`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();

    // 숫자 변환 (Sheets에서 문자열로 올 수 있음)
    const users: Record<string, UserMetrics> = {};
    if (data.users) {
      for (const [key, value] of Object.entries(data.users)) {
        const v = value as Record<string, unknown>;
        users[key] = {
          activeUsers: v.activeUsers ? Number(v.activeUsers) : undefined,
          totalUsers: v.totalUsers ? Number(v.totalUsers) : undefined,
        };
      }
    }

    return {
      contracts: data.contracts || {},
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'saveContract',
        clientName,
        channel: info.channel || '',
        payment: info.payment || '',
        billing: info.billing || '',
        note: info.note || '',
        updatedBy: updatedBy || 'dashboard',
      }),
    });

    const result = await response.json();
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteContract',
        clientName,
      }),
    });

    const result = await response.json();
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'saveUsers',
        clientName,
        activeUsers: metrics.activeUsers ?? '',
        totalUsers: metrics.totalUsers ?? '',
        updatedBy: updatedBy || 'dashboard',
      }),
    });

    const result = await response.json();
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
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteUsers',
        clientName,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('사용자 지표 삭제 실패:', error);
    return false;
  }
}
