import { formatDate } from "./utils";

export interface EventScheduleInfo {
  isTwoDay: boolean;
  startDate: string; // e.g. "2026-09-25"
  endDate: string; // e.g. "2026-09-26"
  startTime: string; // e.g. "9:30 AM"
  endTime: string; // e.g. "4:00 PM"
  displaySchedule: string; // e.g. "25 Sep, 9:30 AM → 26 Sep, 4:00 PM (2-Day Event)"
  dayBadgeText: string; // "Day 1 & 2" | "Day 1" | "Day 2"
  modalBadgeText: string; // "Day 1 & Day 2 (Sept 25 – 26, 2026)"
  startsAtFormatted: string; // "Friday, 25 Sep 2026 • 9:30 AM"
  endsAtFormatted: string; // "Saturday, 26 Sep 2026 • 4:00 PM"
}

export function formatScheduleTime(timeString?: string | null): string {
  if (!timeString) return "";
  const cleaned = timeString.trim();
  if (/am|pm/i.test(cleaned)) return cleaned.toUpperCase();
  const parts = cleaned.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  if (isNaN(h)) return cleaned;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

const KNOWN_TWO_DAY_KEYWORDS = [
  "archathon",
  "skyforge",
  "smart city",
  "bot velocity",
  "draft kings",
  "wonders of ai",
  "hack odyssey",
  "chipcraft",
  "qnx world",
  "accfinthon",
  "biogrant",
  "techdetective",
];

export function getEventSchedule(event?: {
  name?: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
} | null): EventScheduleInfo {
  const desc = event?.description || "";
  const isTwoDayMatch = desc.match(/\[IS_TWO_DAY:\s*(true|false)\]/i);
  const startDateMatch = desc.match(/\[START_DATE:\s*([^\]]+)\]/i);
  const endDateMatch = desc.match(/\[END_DATE:\s*([^\]]+)\]/i);
  const startTimeMatch = desc.match(/\[START_TIME:\s*([^\]]+)\]/i);
  const endTimeMatch = desc.match(/\[END_TIME:\s*([^\]]+)\]/i);
  const schedLabelMatch = desc.match(/\[SCHEDULE_LABEL:\s*([^\]]+)\]/i);

  const isExplicitTwoDay = isTwoDayMatch
    ? isTwoDayMatch[1].toLowerCase() === "true"
    : false;

  const isKeywordTwoDay =
    KNOWN_TWO_DAY_KEYWORDS.some((k) =>
      (event?.name || "").toLowerCase().includes(k)
    ) ||
    desc.toLowerCase().includes("to 26.09") ||
    desc.toLowerCase().includes("to ii day") ||
    desc.toLowerCase().includes("24-hour");

  const isTwoDay = isExplicitTwoDay || isKeywordTwoDay;

  const startDate = startDateMatch
    ? startDateMatch[1].trim()
    : isTwoDay
    ? "2026-09-25"
    : event?.event_date || "2026-09-25";

  const endDate = endDateMatch
    ? endDateMatch[1].trim()
    : isTwoDay
    ? "2026-09-26"
    : event?.event_date || "2026-09-25";

  const rawStartTime = startTimeMatch
    ? startTimeMatch[1].trim()
    : event?.start_time || "09:30:00";

  const rawEndTime = endTimeMatch
    ? endTimeMatch[1].trim()
    : event?.end_time || (isTwoDay ? "16:00:00" : "12:30:00");

  const startTime = formatScheduleTime(rawStartTime) || "9:30 AM";
  const endTime = formatScheduleTime(rawEndTime) || (isTwoDay ? "4:00 PM" : "12:30 PM");

  const displaySchedule = schedLabelMatch
    ? schedLabelMatch[1].trim()
    : isTwoDay
    ? `25 Sep, ${startTime} → 26 Sep, ${endTime} (2-Day Event)`
    : `${startDate === "2026-09-25" ? "25 Sep 2026" : "26 Sep 2026"} • ${startTime} - ${endTime}`;

  const dayBadgeText = isTwoDay
    ? "Day 1 & 2"
    : startDate === "2026-09-25"
    ? "Day 1"
    : "Day 2";

  const modalBadgeText = isTwoDay
    ? "Day 1 & Day 2 (Sept 25 – 26, 2026)"
    : startDate === "2026-09-25"
    ? "Day 1 (Sept 25, 2026)"
    : "Day 2 (Sept 26, 2026)";

  const startsAtFormatted = `${
    startDate === "2026-09-25" ? "Friday, 25 Sep 2026" : "Saturday, 26 Sep 2026"
  } • ${startTime}`;

  const endsAtFormatted = `${
    endDate === "2026-09-26" ? "Saturday, 26 Sep 2026" : "Friday, 25 Sep 2026"
  } • ${endTime}`;

  return {
    isTwoDay,
    startDate,
    endDate,
    startTime,
    endTime,
    displaySchedule,
    dayBadgeText,
    modalBadgeText,
    startsAtFormatted,
    endsAtFormatted,
  };
}
