import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "笔杆子 · 移动端",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        fontFamily: '"LXGW WenKai", "Noto Serif SC", serif',
      }}
    >
      {children}
    </div>
  );
}
