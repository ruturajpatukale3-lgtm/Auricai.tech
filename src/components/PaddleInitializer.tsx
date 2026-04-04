"use client";

import Script from "next/script";

export function PaddleInitializer() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
  const isSandbox = process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true"; // NEXT_PUBLIC required since it's client

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={() => {
        console.log("💳 [PADDLE SDK] Script loaded successfully");
        if (typeof window !== "undefined" && (window as any).Paddle) {
          console.log(`💳 [PADDLE SDK] Initializing: sandbox=${isSandbox}, token_exists=${!!token}`);
          
          try {
            (window as any).Paddle.Environment.set(isSandbox ? "sandbox" : "production");
            (window as any).Paddle.Initialize({ token });
            console.log("💳 [PADDLE SDK] Initialization call complete");
          } catch (e) {
            console.error("💳 [PADDLE SDK] Initialization error:", e);
          }
        }
      }}
    />
  );
}
