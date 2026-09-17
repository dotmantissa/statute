"use client";

import React, { useState } from "react";
import Logo from "./Logo";
import { useTheme } from "../app/providers";
import { usePrivy } from "@privy-io/react-auth";
import { Sun, Moon, Mail, LogOut, CheckCircle2, Shield, Activity, Menu, X, ExternalLink } from "lucide-react";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const email = user?.email?.address || (user as any)?.google?.email;

  const handleCopyEmail = () => {
    if (email) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200 bg-[#f5f9fc]/95 border-[#d2e4f0] dark:bg-[#001525]/95 dark:border-[#003d66]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="#" className="flex items-center focus:outline-none">
            <Logo size={42} showText={true} />
          </a>

          <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium border bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#b0d2e8]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#26ccf0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#26ccf0]"></span>
            </span>
            <span>GenLayer Studio Network</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#26ccf0]/15 text-[#26ccf0]">
              61997
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium mr-2 text-[#3b5a70] dark:text-[#b0d2e8]">
            <a
              href="#adjudicate"
              className="hover:text-[#26ccf0] transition-colors py-1"
            >
              Adjudication Studio
            </a>
            <a
              href="#feed"
              className="hover:text-[#26ccf0] transition-colors py-1"
            >
              Verdicts Feed
            </a>
            <a
              href="#frameworks"
              className="hover:text-[#26ccf0] transition-colors py-1"
            >
              Statutory Frameworks
            </a>
            <a
              href="#playground"
              className="hover:text-[#26ccf0] transition-colors py-1"
            >
              Contract Playground
            </a>
          </nav>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle visual theme"
            className="p-2.5 rounded-xl border transition-all hover:border-[#26ccf0] bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#26ccf0]"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-[#26ccf0]" />
            ) : (
              <Moon className="w-4 h-4 text-[#002139]" />
            )}
          </button>

          {/* Privy Email Authentication */}
          {ready && authenticated && email ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyEmail}
                title="Click to copy verified email"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#ffffff]"
              >
                <Shield className="w-3.5 h-3.5 text-[#26ccf0]" />
                <span className="max-w-[130px] sm:max-w-[170px] truncate">
                  {email}
                </span>
                {copiedEmail ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                    Verified
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                title="Sign out"
                className="p-2.5 rounded-xl border transition-all text-rose-500 border-[#d2e4f0] hover:bg-rose-500/10 hover:border-rose-500/30 dark:border-[#003d66]"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!ready}
              onClick={() => login()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] hover:shadow-[0_0_20px_rgba(38,204,240,0.4)] disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              <span>Sign in with Email</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl border bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-6 border-b bg-white border-[#d2e4f0] dark:bg-[#001525] dark:border-[#003d66] space-y-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border bg-[#f5f9fc] border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <span className="h-2 w-2 rounded-full bg-[#26ccf0]"></span>
            <span className="text-[#002139] dark:text-[#b0d2e8]">GenLayer Studio Network</span>
            <span className="ml-auto font-mono text-[#26ccf0] font-bold">Chain 61997</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href="#adjudicate"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-center border bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              Adjudication Studio
            </a>
            <a
              href="#feed"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-center border bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              Verdicts Feed
            </a>
            <a
              href="#frameworks"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-center border bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              Statutory Frameworks
            </a>
            <a
              href="#playground"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-center border bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              Contract Playground
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
