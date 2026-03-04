import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createSessionToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth';

/**
 * POST /api/auth/login
 *
 * 비밀번호 검증 후 세션 쿠키 발급
 * - timingSafeEqual 로 타이밍 공격 방지
 * - HTTP-only, SameSite=Lax 쿠키 사용
 */
export async function POST(request: NextRequest) {
  let password: string;

  try {
    const body = await request.json();
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  }

  const correctPassword = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!correctPassword || !secret) {
    return NextResponse.json(
      { error: '서버 설정 오류' },
      { status: 500 }
    );
  }

  // 타이밍 공격 방지: 길이가 다를 경우에도 동일한 시간 소요
  const inputBuf = Buffer.from(password);
  const correctBuf = Buffer.from(correctPassword);
  const paddedInput = Buffer.alloc(correctBuf.length);
  inputBuf.copy(paddedInput);

  const isCorrect =
    inputBuf.length === correctBuf.length &&
    timingSafeEqual(paddedInput, correctBuf);

  if (!isCorrect) {
    // 인증 실패 시 약간의 지연 (brute-force 완화)
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json(
      { error: '비밀번호가 올바르지 않습니다' },
      { status: 401 }
    );
  }

  const token = await createSessionToken(secret);

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return response;
}
