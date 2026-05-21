import type { AnalysisResult } from "@/lib/analyzer";

const HISTORY_KEY = "ats-reality-check-history";

export function saveAnalysis(result: AnalysisResult) {
  if (typeof window === "undefined") return;
  const history = getHistory().filter((item) => item.id !== result.id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([result, ...history].slice(0, 8)));
}

export function getHistory(): AnalysisResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as AnalysisResult[]) : [];
  } catch {
    return [];
  }
}

export function getAnalysis(id: string) {
  return getHistory().find((item) => item.id === id);
}
