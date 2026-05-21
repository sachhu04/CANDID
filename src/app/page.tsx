import Link from "next/link";
import { ArrowRight, FileText, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/product/score-ring";

const features = [
  ["ATS readability", "Flags formatting patterns that can scramble parser output."],
  ["JD keyword coverage", "Shows exact matched and missing role signals."],
  ["Experience evidence", "Checks bullets for action verbs, metrics, and impact."],
  ["Risk-first feedback", "Explains why a resume may be filtered or ignored."],
];

const faqs = [
  ["Is this a real ATS score?", "No. No product can know every company's internal ATS logic. This is an estimated compatibility report based on transparent rules."],
  ["Can I upload a PDF?", "For v1, paste PDF text or upload a text-based resume file. The analyzer focuses on the content that an ATS can actually read."],
  ["Does it rewrite my resume?", "It gives ranked fixes and bullet improvement patterns. You stay in control of truthful edits."],
  ["Where is my data stored?", "Analysis history is stored locally in your browser for this version. There is no account system in v1."],
];

export default function Home() {
  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-zinc-200 bg-[url('/hero-texture.png')] bg-cover bg-center dark:border-zinc-800">
        <div className="absolute inset-0 bg-white/88 dark:bg-zinc-950/86" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div>
            <Badge>Honest ATS compatibility analysis</Badge>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Candid
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-650 dark:text-zinc-300">
              A professional resume and job-description analyzer that estimates parseability risk, keyword alignment, role fit, and missing evidence without pretending there is one universal ATS score.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/analyzer">
                <Button size="lg" className="w-full sm:w-auto">
                  Upload resume
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/analyzer">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Paste JD
                </Button>
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-3">
              <Trust icon={<ShieldCheck className="h-4 w-4" />} text="Transparent scoring" />
              <Trust icon={<LockKeyhole className="h-4 w-4" />} text="Local history in v1" />
              <Trust icon={<FileText className="h-4 w-4" />} text="PDF report export" />
            </div>
          </div>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Sample report preview</p>
                <h2 className="mt-1 text-xl font-semibold">Product Analyst role</h2>
              </div>
              <Badge tone="amber">Estimate</Badge>
            </div>
            <div className="mt-6 flex justify-center">
              <ScoreRing score={74} size="md" />
            </div>
            <div className="mt-6 space-y-4">
              <Metric label="Keyword alignment" value={78} />
              <Metric label="Role fit" value={72} />
              <Metric label="Formatting safety" value={86} />
              <Metric label="Experience relevance" value={67} />
            </div>
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Missing signals: Looker, pricing analytics, event-based data ownership.
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge>What it evaluates</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Built for serious applicants who want direct feedback.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(([title, copy]) => (
            <Card key={title} className="p-5">
              <Sparkles className="h-5 w-5 text-zinc-500" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{copy}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50 py-20 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:px-8">
          <div>
            <Badge>Scoring model</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">No mystery number.</h2>
            <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
              The final score is a weighted estimate, and every component is shown in the report.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Keyword match", "30%"],
              ["Semantic role fit", "25%"],
              ["ATS parseability", "20%"],
              ["Experience relevance", "15%"],
              ["Section completeness", "10%"],
            ].map(([label, weight]) => (
              <Card key={label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{label}</span>
                  <Badge>{weight}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight">FAQ</h2>
        <div className="mt-8 space-y-4">
          {faqs.map(([question, answer]) => (
            <Card key={question} className="p-5">
              <h3 className="font-semibold">{question}</h3>
              <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">{answer}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 text-sm text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
          <p>Candid. Transparent resume screening estimates.</p>
          <p>No fake universal ATS score. No vague praise.</p>
        </div>
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-zinc-500">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function Trust({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-950 dark:text-white">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
