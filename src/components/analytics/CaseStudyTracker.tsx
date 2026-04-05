"use client";

import { useEffect, useRef } from "react";

interface CaseStudyTrackerProps {
  id: string;
}

/**
 * Case Study Tracker (Layer 10 Telemetry)
 * 
 * Uses navigator.sendBeacon for distributed reliability (Item 3).
 * Tracks tab activity, scroll depth, and session timing for fraud detection (Item 4 & 6).
 */
export function CaseStudyTracker({ id }: CaseStudyTrackerProps) {
  const sessionStartTime = useRef<number>(Date.now());
  const lastActiveTime = useRef<number>(Date.now());
  const maxScrollDepth = useRef<number>(0);
  const isTabActive = useRef<boolean>(true);

  useEffect(() => {
    // 1. CLICK TRACKING (Global Listener)
    const handleClick = () => {
      const data = JSON.stringify({
        event: "click",
        duration: Date.now() - sessionStartTime.current,
        sessionStartTime: sessionStartTime.current
      });
      navigator.sendBeacon(`/api/public/case-study/${id}/track`, data);
    };

    // 2. READ TIME TRACKING (Interval Ping)
    const interval = setInterval(() => {
      // Only ping if tab was active and user actually scrolled
      if (isTabActive.current && maxScrollDepth.current > 5) {
        const data = JSON.stringify({
          event: "read",
          duration: Date.now() - sessionStartTime.current,
          tabActive: isTabActive.current,
          scrolled: true,
          scrollDepth: maxScrollDepth.current,
          sessionStartTime: sessionStartTime.current
        });
        
        navigator.sendBeacon(`/api/public/case-study/${id}/track`, data);
      }
    }, 15000); // 15s pings

    // 3. ACTIVITY MONITORING
    const handleVisibility = () => {
      isTabActive.current = document.visibilityState === "visible";
    };

    const handleScroll = () => {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const depth = Math.round((scrollTop / (docHeight - winHeight)) * 100);
      
      if (depth > maxScrollDepth.current) {
        maxScrollDepth.current = depth;
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      
      // Final Beacon on Unmount
      const finalData = JSON.stringify({
        event: "read",
        duration: Date.now() - sessionStartTime.current,
        tabActive: isTabActive.current,
        scrolled: maxScrollDepth.current > 20,
        scrollDepth: maxScrollDepth.current,
        sessionStartTime: sessionStartTime.current
      });
      navigator.sendBeacon(`/api/public/case-study/${id}/track`, finalData);
    };
  }, [id]);

  return null; // Invisible component
}
