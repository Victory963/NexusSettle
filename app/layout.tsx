import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Sans_SC } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const sans = Noto_Sans_SC({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Lumen Studio",
  description: "提示词到长片：自动分镜、镜头生成、美工与硬切拼装。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Nav />
        {children}
      </body>
    </html>
  );
}
