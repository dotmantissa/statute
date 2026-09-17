"use client";

import React, { useState } from "react";
import Logo from "./Logo";
import { useTheme } from "../app/providers";
import { usePrivy } from "@privy-io/react-auth";
import { Sun, Moon, Mail, LogOut, CheckCircle2, Shield, Activity } from "lucide-react";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const email = user?.email?.address || (user as any)?.google?.email;

  const handleCopyEmail = () => {
    if (email) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200 bg-[#f5f9fc]/90 border-[#d2e4f0] dark:bg-[#001525]/90 dark:border-[#003d66]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="#" className="flex items-center">
            <Logo size={42} showText={true} />
          </a>

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-white/70 border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#b0d2e8]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#26ccf0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#26ccf0]"></span>
            </span>
            <span>GenLayer Studio Network</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#26ccf0]/15 text-[#26ccf0] font-mono">
              61997
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium mr-2 text-[#3b5a70] dark:text-[#b0d2e8]">
            <a
              href="#adjudicate"
              className="hover:text-[#26ccf0] transition-colors"
            >
              Adjudication Studio
            </a>
            <a
              href="#feed"
              className="hover:text-[#26ccf0] transition-colors"
            >
              Verdicts Feed
            </a>
            <a
              href="#frameworks"
              className="hover:text-[#26ccf0] transition-colors"
            >
              Statutory Frameworks
            </a>
            <a
              href="#playground"
              className="hover:text-[#26ccf0] transition-colors"
            >
              Contract Playground
            </a>
          </nav>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle visual theme"
            className="p-2 rounded-xl border transition-all hover:border-[#26ccf0]/50 bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#26ccf0]"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-[#26ccf0]" />
            ) : (
              <Moon className="w-4 h-4 text-[#002139]" />
            )}
          </button>

          {/* Privy Email Auth */}
          {ready && authenticated && email ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyEmail}
                title="Click to copy verified email"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0]/50 dark:bg-[#002742] dark:border-[#003d66] dark:text-[#ffffff]"
              >
                <Shield className="w-3.5 h-3.5 text-[#26ccf0]" />
                <span className="max-w-[130px] sm:max-w-[180px] truncate">
                  {email}
                </span>
                {copiedEmail ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <span className="text-[10px] text-[#26ccf0] font-sans">
                    Verified
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                title="Sign out"
                className="p-2 rounded-xl border transition-all text-rose-500 border-[#d2e4f0] hover:bg-rose-500/10 hover:border-rose-500/30 dark:border-[#003d66]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!ready}
              onClick={() => login()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] hover:shadow-[0_0_20px_rgba(38,204,240,0.4)] disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              <span>Sign in with Email</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
