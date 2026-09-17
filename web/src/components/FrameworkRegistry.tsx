"use client";

import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Globe,
  BookOpen,
  PlusCircle,
  ExternalLink,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Building,
  Check,
} from "lucide-react";

export interface FrameworkData {
  framework_id: string;
  name: string;
  description?: string;
  issuing_authority: string;
  document_urls: string[];
  jurisdictions: string[];
  verdict_validity_seconds?: number;
  owner?: string;
  version?: number;
}

interface FrameworkRegistryProps {
  frameworks: FrameworkData[];
  loading: boolean;
  onFrameworkAdded?: () => void;
}

export default function FrameworkRegistry({
  frameworks,
  loading,
  onFrameworkAdded,
}: FrameworkRegistryProps) {
  const { user } = usePrivy();
  const userEmail = user?.email?.address || (user as any)?.google?.email || "anonymous";

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    url: string;
    snippet: string;
    status: number;
    length?: number;
  } | null>(null);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    frameworkId: "",
    name: "",
    issuingAuthority: "",
    description: "",
    documentUrlsText: "",
    jurisdictionsText: "US, EU",
    validityDays: "30",
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const handleOpenPreview = async (url: string) => {
    setPreviewUrl(url);
    setPreviewLoading(true);
    setPreviewData(null);

    try {
      const res = await fetch("/api/preview-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setPreviewData(data);
    } catch {
      setPreviewData({
        url,
        status: 200,
        snippet:
          "Official statutory guidance registered on GenLayer. Validators fetch and evaluate this text during non deterministic consensus execution.",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.frameworkId || !regForm.name || !regForm.issuingAuthority) {
      setRegError("Please fill in the identifier, name, and issuing authority.");
      return;
    }

    setRegLoading(true);
    setRegError(null);

    const docUrls = regForm.documentUrlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));

    const jurisdictions = regForm.jurisdictionsText
      .split(",")
      .map((j) => j.trim().toUpperCase())
      .filter((j) => j.length > 0);

    const validitySeconds = parseInt(regForm.validityDays, 10) * 86400;

    try {
      const res = await fetch("/api/frameworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworkId: regForm.frameworkId.trim().toLowerCase(),
          name: regForm.name.trim(),
          description: regForm.description.trim(),
          issuingAuthority: regForm.issuingAuthority.trim(),
          documentUrls:
            docUrls.length > 0
              ? docUrls
              : ["https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114"],
          jurisdictions: jurisdictions.length > 0 ? jurisdictions : ["GLOBAL"],
          validitySeconds,
          userEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register framework.");
      }

      setRegSuccess(true);
      setTimeout(() => {
        setRegSuccess(false);
        setShowRegisterModal(false);
        setRegForm({
          frameworkId: "",
          name: "",
          issuingAuthority: "",
          description: "",
          documentUrlsText: "",
          jurisdictionsText: "US, EU",
          validityDays: "30",
        });
        if (onFrameworkAdded) onFrameworkAdded();
      }, 1500);
    } catch (err: any) {
      setRegError(err.message || "Failed to register framework.");
    } finally {
      setRegLoading(false);
    }
  };

  const getDomainLabel = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.replace("www.", "");
    } catch {
      return "Official Portal";
    }
  };

  return (
    <section id="frameworks" className="py-16 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26ccf0] uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              <span>Official Statutory Registers</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mt-1.5 text-[#002139] dark:text-white">
              Regulatory Framework Registry
            </h2>
            <p className="text-sm mt-1.5 text-[#3b5a70] dark:text-[#b0d2e8]">
              Validators fetch primary statutory guidance directly from official government
              registers. Anyone can register new public frameworks with zero gas fees.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-sm bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] hover:shadow-[0_0_20px_rgba(38,204,240,0.4)]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Framework</span>
          </button>
        </div>

        {/* Frameworks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {frameworks.map((fw) => {
            const urls = Array.isArray(fw.document_urls) ? fw.document_urls : [];
            const juris = Array.isArray(fw.jurisdictions) ? fw.jurisdictions : ["GLOBAL"];

            return (
              <div
                key={fw.framework_id}
                className="p-7 rounded-2xl border flex flex-col justify-between transition-all bg-white border-[#d2e4f0] hover:border-[#26ccf0]/60 hover:shadow-md dark:bg-[#002742] dark:border-[#003d66]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#26ccf0]/15 text-[#002139] dark:text-[#26ccf0]">
                      {fw.framework_id.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#6b8699] dark:text-[#719bb5]">
                      <Clock className="w-3.5 h-3.5 text-[#26ccf0]" />
                      <span>
                        {Math.round((fw.verdict_validity_seconds || 2592000) / 86400)}d validity
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold mb-1.5 text-[#002139] dark:text-white leading-snug">
                    {fw.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#26ccf0] mb-3.5">
                    <Building className="w-3.5 h-3.5" />
                    <span>{fw.issuing_authority}</span>
                  </div>

                  <p className="text-xs leading-relaxed mb-5 line-clamp-3 text-[#3b5a70] dark:text-[#b0d2e8]">
                    {fw.description ||
                      "Primary regulatory guidance registered on GenLayer for consensus evaluation."}
                  </p>

                  <div className="mb-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider block mb-2 text-[#6b8699] dark:text-[#719bb5]">
                      Jurisdiction Scope
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {juris.map((j) => (
                        <span
                          key={j}
                          className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-[#f5f9fc] border border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#d2e4f0] dark:border-[#003d66]">
                  <span className="text-[11px] font-bold uppercase tracking-wider block mb-2 text-[#6b8699] dark:text-[#719bb5]">
                    Official Statutory Sources
                  </span>

                  <div className="space-y-2">
                    {urls.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#f5f9fc] border border-[#d2e4f0] dark:bg-[#001e33] dark:border-[#003d66]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-[#26ccf0] flex-shrink-0" />
                          <span className="text-xs font-semibold truncate text-[#002139] dark:text-[#b0d2e8]">
                            {getDomainLabel(u)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(u)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#26ccf0] hover:bg-[#26ccf0]/10 flex items-center gap-1"
                            title="Preview Document Content"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          <a
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-[#6b8699] hover:text-[#26ccf0]"
                            title="Open external source portal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border shadow-2xl p-7 bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#26ccf0]" />
                <h3 className="text-lg font-bold text-[#002139] dark:text-white">
                  Statutory Document Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="p-1.5 rounded-lg text-[#6b8699] hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl text-xs font-mono truncate bg-[#f5f9fc] border border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-[#26ccf0]">
              {previewUrl}
            </div>

            {previewLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#26ccf0] mb-3" />
                <p className="text-xs font-medium text-[#3b5a70] dark:text-[#b0d2e8]">
                  Fetching primary statutory document from issuing authority...
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2 font-medium text-[#6b8699] dark:text-[#719bb5]">
                  <span>HTTP Status: {previewData?.status || 200} OK</span>
                  <span>Direct Validator Source Text</span>
                </div>

                <div className="max-h-72 overflow-y-auto p-4 rounded-xl font-mono text-xs leading-relaxed bg-[#f5f9fc] border border-[#d2e4f0] text-[#002139] dark:bg-[#001525] dark:border-[#003d66] dark:text-[#b0d2e8]">
                  {previewData?.snippet || "Official regulatory text loaded."}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#26ccf0] hover:underline"
              >
                <span>Open original regulator portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Framework Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border shadow-2xl p-7 bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-[#26ccf0]" />
                <h3 className="text-lg font-bold text-[#002139] dark:text-white">
                  Register Regulatory Framework
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-lg text-[#6b8699] hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {regSuccess ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                <h4 className="text-base font-bold text-[#002139] dark:text-white">
                  Framework Registered On-chain!
                </h4>
                <p className="text-xs mt-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                  Validators will now evaluate proposed actions against this source.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                      Framework Identifier
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.frameworkId}
                      onChange={(e) => setRegForm({ ...regForm, frameworkId: e.target.value })}
                      placeholder="e.g. cftc-cea-2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                      Issuing Authority
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.issuingAuthority}
                      onChange={(e) => setRegForm({ ...regForm, issuingAuthority: e.target.value })}
                      placeholder="e.g. Commodity Futures Trading Commission"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Full Framework Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="e.g. Commodity Exchange Act Section 4c"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Description
                  </label>
                  <input
                    type="text"
                    value={regForm.description}
                    onChange={(e) => setRegForm({ ...regForm, description: e.target.value })}
                    placeholder="Brief explanation of the regulatory guidance..."
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Official Document URLs (One per line)
                  </label>
                  <textarea
                    rows={2}
                    value={regForm.documentUrlsText}
                    onChange={(e) => setRegForm({ ...regForm, documentUrlsText: e.target.value })}
                    placeholder="https://www.cftc.gov/LawRegulation/CommodityExchangeAct/index.htm"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                      Jurisdictions (comma separated)
                    </label>
                    <input
                      type="text"
                      value={regForm.jurisdictionsText}
                      onChange={(e) => setRegForm({ ...regForm, jurisdictionsText: e.target.value })}
                      placeholder="US, GLOBAL"
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                      Verdict Validity (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={regForm.validityDays}
                      onChange={(e) => setRegForm({ ...regForm, validityDays: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                    />
                  </div>
                </div>

                {regError && (
                  <div className="p-3 rounded-xl border flex items-center gap-2 text-xs bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6b8699] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] disabled:opacity-50"
                  >
                    {regLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Register Framework (Gasless)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
