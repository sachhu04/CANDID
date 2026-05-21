import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const tone = value >= 78 ? "bg-green-500" : value >= 55 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900", className)}>
      <div className={cn("h-full rounded-full transition-all duration-700", tone)} style={{ width: `${value}%` }} />
    </div>
  );
}
