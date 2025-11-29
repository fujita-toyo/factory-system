import type { Metadata } from "next";
import "./globals.css";
import { Providers } from './providers';

export const metadata: Metadata = {
  title: "工場配置管理システム",
  description: "工場の人員配置を管理するシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}