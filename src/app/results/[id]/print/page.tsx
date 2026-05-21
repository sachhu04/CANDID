import type { Metadata } from "next";
import { PrintReport } from "@/components/product/print-report";

export const metadata: Metadata = {
  title: "Print Report | Candid",
  description: "Print-friendly compatibility report (Save as PDF).",
};

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrintReport id={id} />;
}
