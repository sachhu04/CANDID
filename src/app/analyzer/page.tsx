import type { Metadata } from "next";
import { AnalyzerWorkspace } from "@/components/product/analyzer-workspace";

export const metadata: Metadata = {
  title: "Analyzer | Candid",
  description: "Paste a resume and job description to generate an honest ATS compatibility report.",
};

export default function AnalyzerPage() {
  return <AnalyzerWorkspace />;
}
