import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "笔杆子 · 连载引擎",
  description: "AI 驱动的长篇小说连载写作引擎",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=LXGW+WenKai:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
