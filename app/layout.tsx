import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-lexend", display: "swap" });

export const metadata: Metadata = {
  title: "Pay With You",
  description: "Pay with you. No card. No phone.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0618",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="young" className={lexend.variable}>
      <body>{children}</body>
    </html>
  );
}
