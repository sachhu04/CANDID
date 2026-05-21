import { cn } from "@/lib/utils";

export function ScoreRing({ score, size = "lg" }: { score: number; size?: "md" | "lg" }) {
  const tone = score >= 78 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#ef4444";
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const dimensions = size === "lg" ? "h-40 w-40" : "h-28 w-28";

  return (
    <div className={cn("relative grid place-items-center", dimensions)} aria-label={`Overall score ${score} out of 100`}>
      <svg className="-rotate-90" viewBox="0 0 128 128" role="img" aria-hidden="true">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-100 dark:text-zinc-900" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={tone}
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <div className={cn("font-semibold tracking-tight", size === "lg" ? "text-4xl" : "text-2xl")}>{score}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">estimated</div>
      </div>
    </div>
  );
}
