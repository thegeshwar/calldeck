"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/queue");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-root">
      <form
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          className="mt-6 w-full bg-green text-black font-bold text-xs uppercase tracking-[2px] py-2.5 rounded font-[family-name:var(--font-mono)] hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
