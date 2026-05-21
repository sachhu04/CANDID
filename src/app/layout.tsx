import type { Metadata } from "next";
import { SiteHeader } from "@/components/product/site-header";
import { ThemeProvider } from "@/components/product/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ats-reality-check.vercel.app"),
  title: {
    default: "Candid | Honest Resume Analyzer",
    template: "%s | Candid",
  },
  description:
    "A transparent ATS compatibility analyzer for resume readability, keyword alignment, role fit, formatting risk, and actionable improvement suggestions.",
  openGraph: {
    title: "Candid",
    description: "Honest resume and job-description compatibility analysis with transparent scoring.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
