import type { Metadata } from "next";
import { ResultsReport } from "@/components/product/results-report";

export const metadata: Metadata = {
  title: "Report | Candid",
  description: "Detailed resume compatibility report with transparent scoring breakdown.",
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsReport id={id} />;
}
