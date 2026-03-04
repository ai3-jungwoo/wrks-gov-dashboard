import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Wrks.ai - 로그인',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-2xl mb-4 shadow-lg">
            W
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Wrks<span className="text-indigo-400">.ai</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">공공 고객사 대시보드</p>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          내부 전용 시스템 · 비인가 접근 금지
        </p>
      </div>
    </div>
  );
}
