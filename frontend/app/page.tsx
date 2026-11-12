import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-[#09090b] dark:text-white">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-7 w-7 dark:text-white" />
          Growstack
        </Link>

        <Link
          href="/sign-in"
          className="text-sm font-medium hover:text-violet-500"
        >
          Sign In
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 rounded-2xl bg-violet-100 p-4 dark:bg-gray-500/10">
          <Sparkles className="h-10 w-10 dark:text-white" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Welcome to{" "}
          <span className="text-violet-600 dark:text-violet-400">
            Growstack
          </span>
        </h1>

        <h2 className="mt-4 text-xl font-medium text-gray-600 dark:text-gray-300 md:text-2xl">
          Think. Create. Grow.
        </h2>

        <p className="mt-5 max-w-xl text-base leading-7 text-gray-500 dark:text-gray-400">
          Your ideas deserve a smarter space. Start conversations,
          explore ideas, and get things done with your AI assistant.
        </p>

        <div className="mt-9 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-xl bg-gray-600 px-8 py-3 font-semibold text-white transition hover:bg-gray-700"
          >
            Get Started
          </Link>

          <Link
            href="/sign-in"
            className="rounded-xl border border-gray-300 px-8 py-3 font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Sign In
          </Link>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-sm text-gray-500">
        © 2026 Growstack. All rights reserved.
      </footer>
    </main>
  );
}
