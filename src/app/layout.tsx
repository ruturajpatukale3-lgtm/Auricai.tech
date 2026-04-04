/**
 * Root Layout — Auricai landing page.
 * Fonts: Geist (primary), Geist Mono (code/metrics).
 * Loaded via next/font for zero FOUT.
 */

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  const isSandbox = process.env.PADDLE_SANDBOX === "true";

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <body className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
          {children}
          <Script
             src="https://cdn.paddle.com/paddle/v2/paddle.js"
             strategy="afterInteractive"
             onLoad={() => {
               console.log("💳 [PADDLE SDK] Script loaded successfully");
               if (typeof window !== "undefined" && (window as any).Paddle) {
                 const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
                 const isSandbox = process.env.PADDLE_SANDBOX === "true";
                 console.log(`💳 [PADDLE SDK] Initializing: sandbox=${isSandbox}, token_exists=${!!token}`);
                 
                 try {
                   (window as any).Paddle.Environment.set(isSandbox ? "sandbox" : "production");
                   (window as any).Paddle.Initialize({ token });
                   console.log("💳 [PADDLE SDK] Initialization call complete");
                 } catch (e) {
                   console.error("💳 [PADDLE SDK] Initialization error:", e);
                 }
               } else {
                 console.error("💳 [PADDLE SDK] Window.Paddle is undefined after script load!");
               }
             }}
           />
        </body>
      </html>
    </ClerkProvider>
  );
}
