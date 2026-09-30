"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push("/admin/menu");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="BonPainer"
            width={72}
            height={72}
            className="mx-auto mb-4 h-[72px] w-[72px] rounded-full object-cover"
            priority
          />
          <h1 className="font-display text-2xl text-[var(--gold-bright)]">Staff Login</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in to manage your restaurant</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--text-muted)]">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2.5 pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--gold)]"
              />
            </div>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-[var(--text-muted)]">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-dim)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2.5 pl-10 pr-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--gold)]"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] py-2.5 text-sm font-bold uppercase tracking-wider text-[var(--bg)] transition hover:bg-[var(--gold-bright)] hover:text-[var(--bg)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
