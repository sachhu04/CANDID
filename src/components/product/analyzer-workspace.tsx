"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, ClipboardPaste, Eye, EyeOff, FileText, History, Loader2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sampleJobDescription, sampleResume } from "@/lib/samples";
import type { AnalysisResult } from "@/lib/analyzer";
import { extractResumePayload } from "@/lib/file-extraction";
import { saveAnalysis, getHistory } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useUrlValidation } from "@/hooks/use-url-validation";

export function AnalyzerWorkspace() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [extractedLinks, setExtractedLinks] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showResumeText, setShowResumeText] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  const validation = useMemo(() => {
    const errors = [];
    if (resumeText.trim().length < 250) errors.push("Resume text needs at least 250 characters.");
    if (jobDescription.trim().length > 0 && jobDescription.trim().length < 250) {
      errors.push("If you include a job description, it needs at least 250 characters.");
    }
    return errors;
  }, [resumeText, jobDescription]);

  const { statuses: linkStatuses, isPolling } = useUrlValidation(extractedLinks);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  async function analyze() {
    setError("");
    if (validation.length) {
      setError(validation[0]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, fileName, extractedLinks }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Analysis failed.");
      const result = payload as AnalysisResult;
      saveAnalysis(result);
      router.push(`/results/${result.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function readFile(file: File) {
    setError("");
    setFileName(file.name);
    setIsExtracting(true);
    try {
      const payload = await extractResumePayload(file);
      setResumeText(payload.text);
      setExtractedLinks(payload.links);
      setShowResumeText(false);
    } catch (caught) {
      setResumeText("");
      setExtractedLinks([]);
      setError(caught instanceof Error ? caught.message : "Unable to extract resume text from this file.");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <Badge>Transparent scoring model</Badge>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Run an ATS compatibility reality check.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Paste your resume. Add a job description if you want keyword and role-fit alignment; otherwise you will get a resume-only strength report.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => { setResumeText(sampleResume); setJobDescription(sampleJobDescription); setFileName("sample-resume.txt"); setExtractedLinks([]); setShowResumeText(true); }}>
            <ClipboardPaste className="h-4 w-4" />
            Fill demo
          </Button>
          <Button type="button" onClick={analyze} disabled={isLoading || isExtracting}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Analyze
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <label htmlFor="resume-text" className="text-sm font-semibold">Resume</label>
              <div className="flex items-center gap-2">
                {fileName ? <Badge tone="green">{fileName}</Badge> : <Badge>PDF, DOCX, TXT, MD, RTF</Badge>}
                {resumeText.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowResumeText((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    aria-label={showResumeText ? "Hide extracted resume text" : "Show extracted resume text"}
                  >
                    {showResumeText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showResumeText ? "Hide extracted text" : "Review extracted text"}
                  </button>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files[0];
                if (file) void readFile(file);
              }}
              className={`mb-4 flex min-h-32 w-full items-center justify-center rounded-lg border border-dashed p-6 text-center transition ${
                isDragging ? "border-zinc-950 bg-zinc-100 dark:border-white dark:bg-zinc-900" : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/70 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="flex flex-col items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                {isExtracting ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {isExtracting ? "Extracting resume text..." : "Drop PDF, DOCX, or text resume"}
                </span>
                <span>Supports `.pdf`, `.docx`, `.txt`, `.md`, `.rtf`. Legacy `.doc` needs conversion to DOCX/PDF.</span>
              </span>
            </button>
            <input ref={inputRef} type="file" className="sr-only" accept=".pdf,.doc,.docx,.txt,.md,.csv,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }} />
            {showResumeText ? (
              <textarea
                id="resume-text"
                value={resumeText}
                onChange={(event) => { setResumeText(event.target.value); if (!showResumeText) setShowResumeText(true); }}
                disabled={isExtracting}
                className="min-h-80 w-full resize-y rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-200"
                placeholder="Paste resume text here, or upload a PDF/DOCX above..."
              />
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                Resume text is extracted and used for analysis. You can review/edit it if the parser missed something.
                {extractedLinks.length ? (
                  <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <div className="mb-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Detected {extractedLinks.length} embedded link(s):
                    </div>
                    <ul className="space-y-1">
                      {extractedLinks.map((link) => {
                        const status = linkStatuses[link] || 'PENDING';
                        return (
                          <li key={link} className="flex items-center gap-2 text-xs">
                            {status === 'PENDING' && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
                            {status === 'WAKING_UP' && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
                            {status === 'VALID' && <span className="h-2 w-2 rounded-full bg-green-500" />}
                            {status === 'INVALID' && <span className="h-2 w-2 rounded-full bg-red-500" />}
                            {status === 'UNKNOWN' && <span className="h-2 w-2 rounded-full bg-zinc-400" />}
                            <span className="truncate max-w-[250px]">{link}</span>
                            <span className="ml-auto text-[10px] uppercase text-zinc-500">
                              {status === 'PENDING' ? 'Verifying URL...' : 
                               status === 'WAKING_UP' ? 'Server waking up...' : status}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <label htmlFor="job-description" className="text-sm font-semibold">Job description (optional)</label>
              <Badge>Better targeting</Badge>
            </div>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="min-h-80 w-full resize-y rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-200"
              placeholder="Paste the full job description here (optional). Leave blank for a resume-only report."
            />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Readiness</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Readiness label="Resume length" ready={resumeText.trim().length >= 250} />
              <Readiness label="Job description length" ready={jobDescription.trim().length === 0 || jobDescription.trim().length >= 250} />
              <Readiness label="Transparent model" ready />
              <Readiness label="PDF export after report" ready />
            </div>
            <Button type="button" className="mt-5 w-full" onClick={analyze} disabled={isLoading || isExtracting}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Analyze Resume
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Previous analyses</h2>
            </div>
            <div className="mt-4 space-y-3">
              {history.length ? history.slice(0, 4).map((item) => (
                <a key={item.id} href={`/results/${item.id}`} className="block rounded-lg border border-zinc-200 p-3 text-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.fileName ?? "Resume analysis"}</span>
                    <Badge tone={item.overallScore >= 78 ? "green" : item.overallScore >= 55 ? "amber" : "red"}>{item.overallScore}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
                </a>
              )) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-zinc-800">
                  No saved reports yet. Your last 8 reports stay in this browser.
                </motion.div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Readiness({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <Badge tone={ready ? "green" : "amber"}>{ready ? "Ready" : "Needs input"}</Badge>
    </div>
  );
}
