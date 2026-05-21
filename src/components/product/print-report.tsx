"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalysisResult, ScoreKey } from "@/lib/analyzer";
import { getAnalysis } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PrintReport({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const autoprint = searchParams.get("autoprint") === "1";

  useEffect(() => {
    setResult(getAnalysis(id) ?? null);
    setIsMounted(true);
  }, [id]);

  useEffect(() => {
    if (!isMounted || !autoprint || !result) return;
    // Give charts a moment to layout before printing.
    const t = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(t);
  }, [isMounted, autoprint, result]);

  if (!isMounted) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center text-zinc-500">
        <p className="text-sm">Loading print report...</p>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Report not found</h1>
        <p className="mt-2 text-sm text-zinc-600">This print view reads from this browser&apos;s saved history. Run a new analysis to generate a report.</p>
        <div className="mt-6">
          <Link href="/analyzer">
            <Button>Open analyzer</Button>
          </Link>
        </div>
      </main>
    );
  }

  const chartData = (Object.keys(result.scores) as ScoreKey[])
    .filter((key) => result.weights[key] > 0)
    .map((key) => ({
      name: result.labels[key],
      score: result.scores[key],
      weight: Math.round(result.weights[key] * 100),
    }));

  const pieData = chartData.map((item) => ({ name: item.name, value: Math.max(1, item.weight) }));
  const palette = ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8"];

  return (
    <main className="bg-white text-zinc-950">
      <style>{printCss}</style>

      <div className="no-print border-b border-zinc-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge>Print/PDF</Badge>
            <span className="text-sm text-zinc-600">Use your browser: Print → Save as PDF</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/results/${id}`}>
              <Button variant="secondary">Back to report</Button>
            </Link>
            <Button onClick={() => window.print()}>Print / Save PDF</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header result={result} />

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <Panel title="Breakdown (scores)">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Breakdown (weights)">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-zinc-700">
              {chartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: palette[index % palette.length] }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.weight}%</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title="What ATS will likely miss">
            <ul className="space-y-2 text-sm leading-6 text-zinc-800">
              {result.atsWillLikelyMiss.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <Panel title="Matched keywords">
            {result.jdProvided ? (
              <div className="flex flex-wrap gap-2">
                {result.matchedKeywords.slice(0, 44).map((k) => (
                  <span key={k} className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-800">
                    {k}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No JD provided. Keyword alignment is skipped.</p>
            )}
          </Panel>

          <Panel title="Missing keywords">
            {result.jdProvided ? (
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.slice(0, 44).map((k) => (
                  <span key={k} className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
                    {k}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No JD provided. Keyword alignment is skipped.</p>
            )}
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title="Section-by-section feedback">
            <div className="grid gap-3 md:grid-cols-2">
              {result.sectionFeedback.map((section) => (
                <div key={section.section} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{section.section}</div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">{section.status}</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">{section.feedback}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <Panel title="Formatting risks">
            <div className="space-y-2">
              {result.formattingIssues.length ? (
                result.formattingIssues.map((issue) => (
                  <div key={issue.label} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{issue.label}</span>
                      <span className="text-xs uppercase tracking-wide text-zinc-500">{issue.severity}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">{issue.evidence}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No obvious parser-hostile formatting detected from extracted text.</p>
              )}
            </div>
          </Panel>

          <Panel title="Suggested edits (ranked)">
            <div className="space-y-2">
              {result.suggestedEdits.map((edit) => (
                <div key={edit.title} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{edit.title}</span>
                    <span className="text-xs uppercase tracking-wide text-zinc-500">{edit.impact}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-700">{edit.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title="Links and contact extraction">
            <div className="grid gap-3 md:grid-cols-2">
              <Signal label="Emails" items={result.contactSignals.emails} />
              <Signal label="Phones" items={result.contactSignals.phones} />
              <Signal label="LinkedIn" items={result.contactSignals.linkedin} />
              <Signal label="GitHub" items={result.contactSignals.github} />
              <Signal label="Portfolio / other" items={result.contactSignals.portfolio} wide />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Hyperlinks are extracted from the uploaded file when possible (PDF annotations / DOCX link targets). The app does not crawl external sites in v1.
            </p>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Header({ result }: { result: AnalysisResult }) {
  const iso = new Date(result.createdAt).toISOString().replace("T", " ").slice(0, 19) + "Z";
  return (
    <header className="flex flex-col justify-between gap-6 border-b border-zinc-200 pb-6 md:flex-row md:items-start">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Candid</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Compatibility report</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{result.disclaimer}</p>
        <p className="mt-3 text-xs text-zinc-500">Generated: {iso}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-right">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Overall</div>
        <div className="mt-1 text-4xl font-semibold">{result.overallScore}</div>
        <div className="mt-1 text-xs text-zinc-500">Estimated compatibility (0-100)</div>
      </div>
    </header>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Signal({ label, items, wide }: { label: string; items: string[]; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-zinc-200 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 space-y-1 text-sm text-zinc-800">
        {items.length ? items.slice(0, 8).map((item) => <div key={item}>{item}</div>) : <div className="text-zinc-500">Not detected</div>}
      </div>
    </div>
  );
}

const printCss = `
@page { size: A4; margin: 14mm; }
@media print {
  .no-print { display: none !important; }
  a { color: inherit; text-decoration: none; }
}
`;
