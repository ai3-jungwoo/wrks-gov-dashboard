import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wrks.ai - 공공 고객사 지도",
  description: "지역별 AI 서비스 활용 현황",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-pretendard antialiased">
        {children}
      </body>
    </html>
  );
}
