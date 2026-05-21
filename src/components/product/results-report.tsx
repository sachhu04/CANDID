"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, ExternalLink, FileWarning, Lightbulb, Search, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "next-themes";
import type { AnalysisResult, ScoreKey } from "@/lib/analyzer";
import { getAnalysis } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/product/score-ring";

export function ResultsReport({ id }: { id: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    setResult(getAnalysis(id) ?? null);
    setIsMounted(true);
  }, [id]);
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "feedback" | "edits">("overview");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const effectiveTab = result && !result.jdProvided && activeTab === "keywords" ? "overview" : activeTab;
  const chartTheme = {
    axis: isDark ? "#a1a1aa" : "#52525b",
    grid: isDark ? "rgba(255,255,255,0.10)" : "rgba(24,24,27,0.10)",
    cursor: isDark ? "rgba(255,255,255,0.06)" : "rgba(24,24,27,0.06)",
    tooltipBg: isDark ? "#0b0b0f" : "#ffffff",
    tooltipBorder: isDark ? "#27272a" : "#e4e4e7",
    tooltipText: isDark ? "#fafafa" : "#18181b",
    tooltipSubtle: isDark ? "#a1a1aa" : "#52525b",
    bar: isDark ? "#fafafa" : "#18181b",
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    return (Object.keys(result.scores) as ScoreKey[]).map((key) => ({
      name: result.labels[key].replace(" ", "\n"),
      score: result.scores[key],
    }));
  }, [result]);

  if (!isMounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <div className="flex animate-pulse flex-col items-center justify-center">
          <div className="mb-4 h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <FileWarning className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Report not found</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">Reports are stored locally in this browser. Run a new analysis to generate a fresh report.</p>
        <Link href="/analyzer" className="mt-6 inline-flex">
          <Button>Open analyzer</Button>
        </Link>
      </div>
    );
  }

  function exportPdf() {
    // html2canvas can crash on modern CSS color functions (lab/oklab). A print-friendly route is more reliable.
    const url = `/results/${id}/print?autoprint=1`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Link href="/analyzer" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to analyzer
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Compatibility report</h1>
          <p className="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-400">{result.disclaimer}</p>
        </div>
        <Button onClick={exportPdf}>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="p-6">
          <div className="flex justify-center">
            <ScoreRing score={result.overallScore} />
          </div>
          <div className="mt-6 text-center">
            <Badge tone={result.overallScore >= 78 ? "green" : result.overallScore >= 55 ? "amber" : "red"}>
              {result.overallScore >= 78 ? "Competitive" : result.overallScore >= 55 ? "Needs tightening" : "High rejection risk"}
            </Badge>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              This score weights keyword alignment, semantic role fit, parseability, experience relevance, and section completeness.
            </p>
          </div>
          <div className="mt-6 space-y-4">
            {(Object.keys(result.scores) as ScoreKey[]).map((key) => (
              <div key={key}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{result.labels[key]}</span>
                  <span className="text-zinc-500">{result.scores[key]}/100</span>
                </div>
                <Progress value={result.scores[key]} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap gap-2">
              {(["overview", "keywords", "feedback", "edits"] as const).map((tab) => {
                const disabled = tab === "keywords" && !result.jdProvided;
                const selected = effectiveTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    disabled={disabled}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-3 py-2 text-sm font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
            {!result.jdProvided ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                No job description provided. Keyword and role-fit alignment are skipped; the score reflects resume strength only.
              </p>
            ) : null}
          </Card>

          {effectiveTab === "overview" ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Score breakdown</h2>
                <div className="mt-5 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        tick={{ fill: chartTheme.axis }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        tick={{ fill: chartTheme.axis }}
                      />
                      <Tooltip
                        cursor={{ fill: chartTheme.cursor }}
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          borderColor: chartTheme.tooltipBorder,
                          borderRadius: 10,
                          boxShadow: isDark ? "0 12px 30px rgba(0,0,0,0.55)" : "0 12px 30px rgba(24,24,27,0.12)",
                        }}
                        labelStyle={{ color: chartTheme.tooltipSubtle, fontWeight: 600 }}
                        itemStyle={{ color: chartTheme.tooltipText }}
                      />
                      <Bar dataKey="score" fill={chartTheme.bar} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="font-semibold text-amber-950 dark:text-amber-200">What ATS will likely miss</h2>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900 dark:text-amber-200">
                      {result.atsWillLikelyMiss.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  </div>
                </div>
              </Card>
              {result.marketFeedback ? (
                <Card className="border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="mt-1 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <h2 className="font-semibold text-indigo-950 dark:text-indigo-200">AI Market Reality Check</h2>
                      <p className="mt-3 text-sm leading-6 text-indigo-900 dark:text-indigo-200">
                        {result.marketFeedback}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : null}
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Resume strength checklist</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {result.checklist.map((item) => (
                    <div key={item.label} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex items-center gap-2 font-medium">
                        {item.passed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        {item.label}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><ExternalLink className="h-5 w-5" /> Links and contact extraction</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SignalGroup label="Emails" items={result.contactSignals.emails} />
                  <SignalGroup label="Phones" items={result.contactSignals.phones} />
                  <SignalGroup label="LinkedIn" items={result.contactSignals.linkedin} />
                  <SignalGroup label="GitHub" items={result.contactSignals.github} />
                  <SignalGroup label="Portfolio / other links" items={result.contactSignals.portfolio} wide />
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  The app extracts links from the resume text it can read. It does not crawl external websites in v1, which avoids privacy surprises and slow analysis.
                </p>
              </Card>
            </motion.div>
          ) : null}

          {effectiveTab === "keywords" ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-2">
              <KeywordPanel title="Matched keywords" tone="green" items={result.matchedKeywords} />
              <KeywordPanel title="Missing keywords" tone="red" items={result.missingKeywords} />
              <Card className="p-5 lg:col-span-2">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Search className="h-5 w-5" /> Exact JD phrases not found</h2>
                <div className="mt-4 space-y-3">
                  {result.exactJdPhrasesMissing.length ? result.exactJdPhrasesMissing.map((phrase) => (
                    <p key={phrase} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">{phrase}</p>
                  )) : <p className="text-sm text-zinc-500">No major exact requirement phrases were missing.</p>}
                </div>
              </Card>
            </motion.div>
          ) : null}

          {effectiveTab === "feedback" ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Section-by-section feedback</h2>
                <div className="mt-4 space-y-3">
                  {result.sectionFeedback.map((section) => (
                    <div key={section.section} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-medium">{section.section}</h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{section.feedback}</p>
                      </div>
                      <Badge tone={section.status === "missing" ? "red" : section.status === "weak" ? "amber" : "green"}>{section.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Formatting risks</h2>
                <div className="mt-4 space-y-3">
                  {result.formattingIssues.length ? result.formattingIssues.map((issue) => (
                    <div key={issue.label} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{issue.label}</span>
                        <Badge tone={issue.severity === "high" ? "red" : issue.severity === "medium" ? "amber" : "neutral"}>{issue.severity}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{issue.evidence}</p>
                    </div>
                  )) : <p className="text-sm text-zinc-500">No obvious table, icon, image, or multi-column risk detected in the provided text.</p>}
                </div>
              </Card>
            </motion.div>
          ) : null}

          {effectiveTab === "edits" ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Suggested edits ranked by impact</h2>
                <div className="mt-4 space-y-3">
                  {result.suggestedEdits.map((suggestion) => (
                    <div key={suggestion.title} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <Badge tone={suggestion.impact === "High" ? "red" : suggestion.impact === "Medium" ? "amber" : "neutral"}>{suggestion.impact} impact</Badge>
                      <h3 className="mt-3 font-medium">{suggestion.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{suggestion.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Lightbulb className="h-5 w-5" /> Improve this bullet</h2>
                <div className="mt-4 space-y-3">
                  {result.bulletImprovements.length ? result.bulletImprovements.map((item) => (
                    <div key={item.original} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <p className="text-sm text-zinc-500">Original: {item.original}</p>
                      <p className="mt-3 text-sm font-medium">{item.improved}</p>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.reason}</p>
                    </div>
                  )) : <p className="text-sm text-zinc-500">No weak measurable bullets were detected from the pasted text.</p>}
                </div>
              </Card>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function KeywordPanel({ title, items, tone }: { title: string; items: string[]; tone: "green" | "red" }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Badge key={item} tone={tone}>{item}</Badge>) : <p className="text-sm text-zinc-500">None detected.</p>}
      </div>
    </Card>
  );
}

function SignalGroup({ label, items, wide }: { label: string; items: string[]; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 ${wide ? "sm:col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold">{label}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Badge key={item} tone="green">{item}</Badge>) : <Badge tone="amber">Not detected</Badge>}
      </div>
    </div>
  );
}
