import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT", "WONK"] });
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://afterscan.vercel.app"),
  title: "Afterscan — the follow-up your scan report asked for",
  description:
    "Paste a radiology report. Get a plain-English explanation and the follow-up that published guidelines call for, with dates, so an incidental finding never slips through.",
  openGraph: {
    title: "Afterscan",
    description: "The scan found something else. Here is what the guidelines say to do about it.",
    url: "https://afterscan.vercel.app",
    siteName: "Afterscan",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <header className="no-print border-b border-line/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="display text-xl font-semibold tracking-tight">
              Afterscan
            </Link>
            <nav className="flex items-center gap-5 text-sm text-ink-2">
              <Link href="/tracker" className="hover:text-ink">My follow-ups</Link>
              <Link href="/methods" className="hover:text-ink">How it works</Link>
              <a href="https://github.com/rikhinkavuru/afterscan" className="hover:text-ink" target="_blank" rel="noreferrer">
                Source
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="no-print mt-20 border-t border-line/70">
          <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-ink-3">
            <p>
              Afterscan is not medical advice and does not diagnose. It quotes published radiology guidelines so you can ask
              better questions. Your care team makes every decision. Your report is sent to an AI model to be read and is not
              stored by Afterscan; anything you save in “My follow-ups” stays in your own browser.
            </p>
            <p className="mt-2">Built for the CodeTheCure Hackathon 2026.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
