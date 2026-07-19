"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  const t = useTranslations("notFound");
  const tn = useTranslations("home");

  return (
    <main className="relative flex min-h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-360 items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-16">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/image/logo.png"
              alt={tn("brandAlt")}
              width={30}
              height={30}
              priority
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-semibold tracking-widest text-zinc-800 uppercase dark:text-zinc-200">
              {tn("nav.brand")}
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <FileQuestion className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <p className="mt-6 text-8xl font-semibold tracking-tighter text-zinc-200 dark:text-zinc-800">
            404
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-500 dark:text-zinc-400">
            {t("description")}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-200 px-6 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
