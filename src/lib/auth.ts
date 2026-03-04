/**
 * 인증 유틸리티 (Web Crypto API - Edge Runtime 호환)
 *
 * 추가 패키지 없이 Next.js 미들웨어에서도 동작합니다.
 * 세션 토큰 형식: base64url(payload).base64url(HMAC-SHA256 signature)
 */

export const COOKIE_NAME = 'gov_session';

/** 세션 유효 시간 (초) - 기본 8시간 */
export const COOKIE_MAX_AGE = 60 * 60 * 8;

// ============================================================================
// 내부 유틸리티
// ============================================================================

function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromBase64url(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// ============================================================================
// 세션 토큰 생성 / 검증
// ============================================================================

/**
 * 서명된 세션 토큰 생성
 */
export async function createSessionToken(secret: string): Promise<string> {
  const payload = JSON.stringify({
    iat: Date.now(),
    exp: Date.now() + COOKIE_MAX_AGE * 1000,
  });

  const payloadBytes = new TextEncoder().encode(payload);
  const encodedPayload = toBase64url(payloadBytes);

  const key = await getHmacKey(secret);
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload)
  );

  return `${encodedPayload}.${toBase64url(new Uint8Array(sigBuffer))}`;
}

/**
 * 세션 토큰 검증
 * - 서명 위조 여부 확인
 * - 만료 여부 확인
 */
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<boolean> {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return false;

    const encodedPayload = token.slice(0, dotIdx);
    const encodedSig = token.slice(dotIdx + 1);

    if (!encodedPayload || !encodedSig) return false;

    const key = await getHmacKey(secret);
    const sigBytes = fromBase64url(encodedSig);
    const msgBytes = new TextEncoder().encode(encodedPayload);

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, msgBytes);
    if (!isValid) return false;

    const payloadBytes = fromBase64url(encodedPayload);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}
