import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

/**
 * 공개 경로 - 인증 없이 접근 가능
 */
const PUBLIC_PATHS = ['/login', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    // AUTH_SECRET 환경변수 미설정 시 서버 오류 응답
    return new NextResponse('서버 설정 오류: AUTH_SECRET이 설정되지 않았습니다.', {
      status: 500,
    });
  }

  if (!token || !(await verifySessionToken(token, secret))) {
    const loginUrl = new URL('/login', request.url);
    // 로그인 후 원래 페이지로 돌아가기
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 다음 경로는 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
