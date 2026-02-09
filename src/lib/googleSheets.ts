/**
 * Google Sheets API 연동
 *
 * 계약 정보와 사용자 지표를 Google Sheets에 저장/불러오기
 *
 * Google Apps Script:
 * - GET (doGet): 읽기 전용
 * - POST (doPost): 쓰기 작업 (302 redirect로 결과 반환)
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
 * GET 요청 (읽기용)
 */
async function callGetAPI(params: Record<string, string>): Promise<Record<string, unknown>> {
  const searchParams = new URLSearchParams(params);
  const url = `${API_URL}?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
  });

  const text = await response.text();

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<HTML') || text.startsWith('<html')) {
    console.error('API 오류 응답:', text.substring(0, 300));
    throw new Error('API 오류');
  }

  return JSON.parse(text);
}

/**
 * POST 요청 (쓰기용)
 * Google Apps Script는 POST 결과를 302 redirect URL로 반환함
 * 브라우저에서 cross-origin redirect를 따라가기 어려우므로 수동 처리
 */
async function callPostAPI(params: Record<string, string>): Promise<Record<string, unknown>> {
  try {
    // 1차 시도: redirect: follow
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      redirect: 'follow',
    });

    const text = await response.text();
    console.log('POST 응답 상태:', response.status, '타입:', response.type);
    console.log('POST 응답 내용:', text.substring(0, 200));

    // JSON 응답이면 성공
    if (text.startsWith('{')) {
      return JSON.parse(text);
    }

    // HTML redirect 페이지인 경우
    if (text.includes('Moved Temporarily') || text.includes('HREF=')) {
      // redirect URL 추출
      const match = text.match(/HREF="([^"]+)"/i);
      if (match && match[1]) {
        const redirectUrl = match[1].replace(/&amp;/g, '&');
        console.log('Redirect URL:', redirectUrl);

        // redirect URL에서 결과 가져오기
        const redirectResponse = await fetch(redirectUrl);
        const redirectText = await redirectResponse.text();
        console.log('Redirect 응답:', redirectText);

        if (redirectText.startsWith('{')) {
          return JSON.parse(redirectText);
        }
      }
    }

    // opaque 응답 처리 (no-cors 모드)
    if (response.type === 'opaque') {
      console.log('Opaque 응답 - 성공으로 간주');
      return { success: true };
    }

    throw new Error('예상치 못한 응답 형식');
  } catch (error) {
    console.error('POST API 호출 실패:', error);
    throw error;
  }
}

/**
 * 모든 데이터 불러오기
 */
export async function fetchAllData(): Promise<SheetData> {
  try {
    const data = await callGetAPI({ action: 'getAll' });

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
    const result = await callPostAPI({
      action: 'saveContract',
      clientName,
      channel: info.channel || '',
      payment: info.payment || '',
      billing: info.billing || '',
      note: info.note || '',
      updatedBy: updatedBy || 'dashboard',
    });
    console.log('saveContract 결과:', result);
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
    const result = await callPostAPI({
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
    const result = await callPostAPI({
      action: 'saveUsers',
      clientName,
      activeUsers: metrics.activeUsers?.toString() ?? '',
      totalUsers: metrics.totalUsers?.toString() ?? '',
      updatedBy: updatedBy || 'dashboard',
    });
    console.log('saveUserMetrics 결과:', result);
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
    const result = await callPostAPI({
      action: 'deleteUsers',
      clientName,
    });
    return result.success === true;
  } catch (error) {
    console.error('사용자 지표 삭제 실패:', error);
    return false;
  }
}
