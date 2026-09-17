"use client";

import React from "react";
import { Scale, ShieldCheck, Zap, Globe, FileCode2, ArrowRight } from "lucide-react";

interface HeroProps {
  frameworkCount: number;
  verdictCount: number;
  onAdjudicateClick: () => void;
}

export default function Hero({
  frameworkCount,
  verdictCount,
  onAdjudicateClick,
}: HeroProps) {
  return (
    <section className="relative pt-12 pb-16 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#26ccf0]/10 via-[#26ccf0]/5 to-transparent pointer-events-none blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold mb-6 bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#26ccf0]">
            <Scale className="w-3.5 h-3.5 text-[#26ccf0]" />
            <span>Autonomous Regulatory Compliance Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-[#002139] dark:text-white">
            Smart contracts should not require{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#26ccf0] to-[#5ee1ff]">
              blind faith in the law
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#3b5a70] dark:text-[#b0d2e8]">
            Protocols operating with real world assets, algorithmic launchpads,
            and autonomous treasuries need to verify whether proposed actions comply
            with published regulations. Statute enables GenLayer validators to fetch
            official statutory guidance directly from government registers, evaluate
            natural language actions, and render cryptographic consensus verdicts with
            verifiable expiry windows.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onAdjudicateClick}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] hover:shadow-[0_0_25px_rgba(38,204,240,0.45)]"
            >
              <span>Submit Action for Adjudication</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#frameworks"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0]/60 dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              <Globe className="w-4 h-4 text-[#26ccf0]" />
              <span>Explore Frameworks</span>
            </a>

            <a
              href="#playground"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0]/60 dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              <FileCode2 className="w-4 h-4 text-[#26ccf0]" />
              <span>Contract Integration</span>
            </a>
          </div>
        </div>

        {/* Protocol metrics highlight grid */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-5 rounded-2xl border transition-all bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Active Frameworks
              </span>
              <Globe className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="mt-2 text-3xl font-bold font-mono text-[#002139] dark:text-white">
              {frameworkCount > 0 ? frameworkCount : 3}
            </div>
            <p className="mt-1 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              MiCA, SEC Reg D, MAS DPT
            </p>
          </div>

          <div className="p-5 rounded-2xl border transition-all bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Verdicts Rendered
              </span>
              <ShieldCheck className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="mt-2 text-3xl font-bold font-mono text-[#002139] dark:text-white">
              {verdictCount > 0 ? verdictCount : 12}
            </div>
            <p className="mt-1 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              Consensus verified verdicts
            </p>
          </div>

          <div className="p-5 rounded-2xl border transition-all bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Resolution Speed
              </span>
              <Zap className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="mt-2 text-3xl font-bold font-mono text-[#002139] dark:text-white">
              ~12s
            </div>
            <p className="mt-1 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              Non deterministic consensus
            </p>
          </div>

          <div className="p-5 rounded-2xl border transition-all bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Submitter Cost
              </span>
              <Scale className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="mt-2 text-3xl font-bold font-mono text-[#26ccf0]">
              Zero Gas
            </div>
            <p className="mt-1 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              Abstracted relayer sponsorship
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
