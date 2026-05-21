import Link from "next/link";
import { Logo } from "@/components/product/logo";
import { ThemeToggle } from "@/components/product/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition" aria-label="Candid home">
          <Logo className="h-8 w-8" />
          <span className="font-semibold tracking-tight text-xl text-zinc-950 dark:text-white">Candid</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/analyzer" className="hidden text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white sm:inline">
            Analyzer
          </Link>
          <ThemeToggle />
          <Link href="/analyzer">
            <Button size="sm">Run check</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
