/**
 * Root Layout — Auricai landing page.
 * Fonts: Geist (primary), Geist Mono (code/metrics).
 * Loaded via next/font for zero FOUT.
 */

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auricai — Automate Data-Driven Case Studies with AI",
  description:
    "Deploy an AI Journalist to extract hard ROI metrics from your clients automatically. Your client spends 3 minutes. You get a surgical, approved case study page by tomorrow.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Auricai — Automate Data-Driven Case Studies with AI",
    description:
      "Deploy an AI Journalist to extract hard ROI metrics from your clients automatically.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <body className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
