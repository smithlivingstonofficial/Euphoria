import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(m) && m >= 0 && m < 12 && !isNaN(d)) {
      return `${d} ${months[m]} ${y}`;
    }
  }
  return dateString;
}

export function formatTime(timeString: string): string {
  if (!timeString) return "";
  const parts = timeString.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return timeString;
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

export function formatEventTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime) return "Time TBA";
  const start = formatTime(startTime);
  const end = endTime ? formatTime(endTime) : "";
  if (!end || start === end) {
    return `${start} onwards`;
  }
  return `${start} - ${end}`;
}

export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatSectionLabel(secNum: number, rawLabel?: string | null): string {
  if (rawLabel) {
    const clean = rawLabel.trim();
    if (
      clean.toLowerCase().includes("morning") ||
      clean.toLowerCase().includes("afternoon") ||
      clean.toLowerCase().includes("day 1") ||
      clean.toLowerCase().includes("day 2")
    ) {
      return `${getOrdinal(secNum)} Section`;
    }
    return clean;
  }
  return `${getOrdinal(secNum)} Section`;
}

export function formatCompactSectionLabel(secNum: number, rawLabel?: string | null): string {
  const full = formatSectionLabel(secNum, rawLabel);
  if (full.endsWith(" Section")) {
    return full.replace(" Section", " Sec");
  }
  return full;
}

