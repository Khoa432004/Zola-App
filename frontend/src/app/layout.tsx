import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Sử dụng Inter font với Vietnamese subset để hỗ trợ tốt tiếng Việt
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZolaChat",
  description: "Welcome to ZolaChat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
