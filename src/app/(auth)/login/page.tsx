"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(formRef.current!);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Hard redirect — no hydration mismatch, clean page load
    window.location.href = "/queue";
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-root">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-bg-elevated border-2 border-border rounded-lg p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-md bg-green flex items-center justify-center text-black font-bold text-lg font-[family-name:var(--font-mono)]">
            C
          </div>
          <span className="text-xl font-semibold tracking-tight text-text-primary">
            CallDeck
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              suppressHydrationWarning
              className="w-full bg-bg-surface border-2 border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-border-bright transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.8px] text-text-muted mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              suppressHydrationWarning
              className="w-full bg-bg-surface border-2 border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-border-bright transition-colors"
              required
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red font-[family-name:var(--font-mono)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-green text-black font-bold text-xs uppercase tracking-[2px] py-3 rounded font-[family-name:var(--font-mono)] hover:brightness-110 active:translate-y-[1px] transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
