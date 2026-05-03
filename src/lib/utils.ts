import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { zhTW, enUS } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined, locale: string = "zh-TW"): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "yyyy/MM/dd", {
      locale: locale === "zh-TW" ? zhTW : enUS,
    });
  } catch {
    return dateStr;
  }
}

export function isOverdue(dueDateStr: string | null | undefined): boolean {
  if (!dueDateStr) return false;
  try {
    return isBefore(parseISO(dueDateStr), new Date());
  } catch {
    return false;
  }
}

export function isUpcoming(dueDateStr: string | null | undefined, days = 3): boolean {
  if (!dueDateStr) return false;
  try {
    const date = parseISO(dueDateStr);
    const future = new Date();
    future.setDate(future.getDate() + days);
    return isAfter(date, new Date()) && isBefore(date, future);
  } catch {
    return false;
  }
}

export function calcProgress(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

export function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson) as string[];
  } catch {
    return [];
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(tags);
}
