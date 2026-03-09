"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Metadata } from "next";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const router   = useRouter();
  const supabase = createClientComponentClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else        { router.push("/"); router.refresh(); }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function handleMagicLink() {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
    else        { setSent(true); setLoading(false); }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center max-w-md w-full"
             style={{ boxShadow: "0 8px 32px rgba(15,23,42,0.08)" }}>
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Check your email</h2>
          <p className="text-sm text-[#64748B]">
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-[#E8315A] rounded-xl flex items-center justify-center
                            group-hover:bg-[#C41E45] transition-colors">
              <span className="text-white text-xl">🎟</span>
            </div>
            <span className="text-xl font-bold text-[#0F172A]">
              Ticket<span className="text-[#E8315A]">Mint</span>
            </span>
          </a>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mt-6">Welcome back</h1>
          <p className="text-sm text-[#64748B] mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 space-y-4"
             style={{ boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}>

          {/* OAuth buttons */}
          <button
            onClick={() => handleOAuth("google")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border
                       border-[#E2E8F0] bg-white hover:bg-[#F8F9FA] transition-colors text-sm
                       font-semibold text-[#334155] min-h-[44px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth("apple")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border
                       border-[#E2E8F0] bg-[#0F172A] hover:bg-black transition-colors text-sm
                       font-semibold text-white min-h-[44px]"
          >
            <svg width="16" height="18" viewBox="0 0 814 1000">
              <path fill="white" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.2-57.1-155.6-127.4C46 447.5 0 316.2 0 194.1 0 70.4 55.8 7.5 136.8 7.5c67.2 0 110.9 44.2 162.3 44.2 48.3 0 99.9-47.3 168.2-47.3 52.9 0 141.5 18.5 198.3 89.4zm-201.7-96.1c-34.3 37.9-97.7 66.5-146.2 66.5-3.6 0-7.3-.5-11-.8 3.8-48.1 26.2-99.5 60.2-132.5 37.5-37.2 101.9-64.3 154.7-68.7 3.2 48.9-13.1 99.9-57.7 135.5z"/>
            </svg>
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-[#94A3B8] font-medium">or</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input w-full px-4 py-3 text-sm text-[#0F172A] bg-[#F8F9FA]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#334155]">Password</label>
                <button type="button" onClick={handleMagicLink}
                        className="text-xs text-[#E8315A] hover:underline">
                  Email me a link instead
                </button>
              </div>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input w-full px-4 py-3 text-sm text-[#0F172A] bg-[#F8F9FA]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#E8315A] font-medium bg-[#FFF0F3] border border-[#FECDD3]
                            rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading}
                    className="btn-primary w-full py-3.5 text-sm font-bold rounded-xl min-h-[44px]">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#E8315A] font-semibold hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
