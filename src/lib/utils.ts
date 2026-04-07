/**
 * Utility functions for CaseFlow
 * Handles className merging, formatting, and common helpers
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with commas (e.g., 2400000 → "2,400,000") */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/** Format a number as currency (e.g., 2400000 → "$2,400,000") */
export function formatCurrency(num: number): string {
  return `$${formatNumber(num)}`;
}

/** Format percentage (e.g., 280 → "280%") */
export function formatPercentage(num: number): string {
  return `${num}%`;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/** Standard fetcher for SWR */
export const fetcher = (url: string) => fetch(url).then((res) => res.json());
