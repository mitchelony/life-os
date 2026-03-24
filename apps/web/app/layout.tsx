import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Life OS",
  description: "A calm personal operating system for life, money, and next actions.",
  applicationName: "Life OS",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f3ede4",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
