"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  RefreshCw,
  Scale,
  ExternalLink,
  ArrowRight,
  Filter,
} from "lucide-react";

export interface VerdictItem {
  verdict_id: string;
  action_id: string;
  action_hash: string;
  action_title?: string;
  action_description?: string;
  framework_id: string;
  verdict: "COMPLIANT" | "CAUTION_WITH_CONDITIONS" | "NON_COMPLIANT";
  confidence_score: number;
  applicable_clauses?: string[];
  conditions?: string[];
  reasoning?: string;
  risk_factors?: string[];
  adjudicated_at: number;
  expires_at: number;
  is_compliant: boolean;
  is_expired: boolean;
  tx_hash?: string;
}

interface VerdictsFeedProps {
  verdicts: VerdictItem[];
  loading: boolean;
  onRefresh: () => void;
  onSelectActionHash?: (hash: string) => void;
}

export default function VerdictsFeed({
  verdicts,
  loading,
  onRefresh,
  onSelectActionHash,
}: VerdictsFeedProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCopy = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredVerdicts = verdicts.filter((item) => {
    if (filter !== "ALL" && item.verdict !== filter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.action_title && item.action_title.toLowerCase().includes(q)) ||
      (item.action_id && item.action_id.toLowerCase().includes(q)) ||
      (item.framework_id && item.framework_id.toLowerCase().includes(q)) ||
      (item.action_hash && item.action_hash.toLowerCase().includes(q))
    );
  });

  const formatExpiry = (expiresAt: number, isExpired: boolean) => {
    if (isExpired) return "Expired";
    const nowSec = Math.floor(Date.now() / 1000);
    const diff = Number(expiresAt) - nowSec;
    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `Valid for ${days}d ${hours}h`;
    return `Valid for ${hours}h`;
  };

  return (
    <section id="feed" className="py-16 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26ccf0] uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              <span>Public Adjudication Register</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mt-1.5 text-[#002139] dark:text-white">
              Live Compliance Verdicts Feed
            </h2>
            <p className="text-sm mt-1.5 text-[#3b5a70] dark:text-[#b0d2e8]">
              Verified consensus rulings rendered by GenLayer validators. Cryptographically
              indexed on-chain and in PostgreSQL for rapid protocol discovery.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#26ccf0]" : ""}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Controls: Search & Filter Tabs */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
          <div className="relative w-full sm:w-88">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#6b8699]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action title, ID, or framework..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs outline-none transition-all focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {["ALL", "COMPLIANT", "CAUTION_WITH_CONDITIONS", "NON_COMPLIANT"].map((status) => {
              const label =
                status === "ALL"
                  ? "All Verdicts"
                  : status === "COMPLIANT"
                  ? "Compliant"
                  : status === "CAUTION_WITH_CONDITIONS"
                  ? "Caution"
                  : "Non Compliant";

              const isActive = filter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#26ccf0] text-[#002139] shadow-sm"
                      : "bg-[#f5f9fc] text-[#3b5a70] border border-[#d2e4f0] hover:border-[#26ccf0] dark:bg-[#001e33] dark:border-[#003d66] dark:text-[#b0d2e8]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Verdicts List */}
        {loading && verdicts.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <RefreshCw className="w-9 h-9 animate-spin mx-auto text-[#26ccf0] mb-3" />
            <p className="text-sm font-bold text-[#002139] dark:text-white">
              Loading consensus verdicts from GenLayer...
            </p>
          </div>
        ) : filteredVerdicts.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
            <Scale className="w-10 h-10 mx-auto text-[#6b8699] mb-3" />
            <h3 className="text-base font-bold text-[#002139] dark:text-white">
              No matching verdicts found
            </h3>
            <p className="text-xs mt-1 text-[#3b5a70] dark:text-[#b0d2e8]">
              Try adjusting your search query or submit a new action in the studio above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVerdicts.map((item) => {
              const isExpanded = expandedId === item.verdict_id;
              const isExpired = item.is_expired;

              return (
                <div
                  key={item.verdict_id}
                  className="rounded-2xl border transition-all overflow-hidden bg-white border-[#d2e4f0] hover:border-[#26ccf0]/50 hover:shadow-sm dark:bg-[#002742] dark:border-[#003d66]"
                >
                  {/* Summary Bar */}
                  <div
                    onClick={() => toggleExpand(item.verdict_id)}
                    className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0">
                        {item.verdict === "COMPLIANT" && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                        )}
                        {item.verdict === "CAUTION_WITH_CONDITIONS" && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                        )}
                        {item.verdict === "NON_COMPLIANT" && (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                            <XCircle className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#26ccf0]/15 text-[#002139] dark:text-[#26ccf0]">
                            {item.framework_id.toUpperCase()}
                          </span>

                          <span className="text-xs font-mono text-[#6b8699] dark:text-[#719bb5]">
                            {item.action_id}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#002139] dark:text-white leading-snug">
                          {item.action_title || item.action_id}
                        </h3>

                        {item.action_description && (
                          <p className="text-xs mt-1 line-clamp-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                            {item.action_description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3.5 self-end md:self-center flex-shrink-0">
                      {/* Verdict Badge */}
                      <div className="text-right">
                        {item.verdict === "COMPLIANT" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400">
                            COMPLIANT
                          </span>
                        )}
                        {item.verdict === "CAUTION_WITH_CONDITIONS" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400">
                            CAUTION
                          </span>
                        )}
                        {item.verdict === "NON_COMPLIANT" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:text-rose-400">
                            NON COMPLIANT
                          </span>
                        )}

                        <div className="text-[11px] mt-1 font-mono text-[#6b8699] dark:text-[#719bb5]">
                          Confidence: <strong>{item.confidence_score}%</strong>
                        </div>
                      </div>

                      {/* Expiry Pill */}
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-[#f5f9fc] border-[#d2e4f0] text-[#3b5a70] dark:bg-[#001e33] dark:border-[#003d66] dark:text-[#b0d2e8]">
                        <Clock className="w-3.5 h-3.5 text-[#26ccf0]" />
                        <span>{formatExpiry(item.expires_at, isExpired)}</span>
                      </div>

                      <div className="text-[#6b8699] dark:text-[#719bb5] p-1">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="p-6 border-t bg-[#f5f9fc]/50 border-[#d2e4f0] dark:bg-[#001e33]/50 dark:border-[#003d66]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Reasoning */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                            Validator Consensus Reasoning
                          </h4>
                          <p className="text-xs leading-relaxed text-[#3b5a70] dark:text-[#b0d2e8]">
                            {item.reasoning || "No extended reasoning provided."}
                          </p>
                        </div>

                        {/* Conditions or Risk factors */}
                        <div>
                          {item.conditions && item.conditions.length > 0 ? (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-amber-500">
                                Required Compliance Conditions
                              </h4>
                              <ul className="space-y-1.5">
                                {item.conditions.map((cond, i) => (
                                  <li key={i} className="text-xs flex items-start gap-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                                    <span className="text-amber-500 mt-0.5">&bull;</span>
                                    <span>{cond}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : item.risk_factors && item.risk_factors.length > 0 ? (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-rose-500">
                                Identified Risk Factors
                              </h4>
                              <ul className="space-y-1.5">
                                {item.risk_factors.map((risk, i) => (
                                  <li key={i} className="text-xs flex items-start gap-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                                    <span className="text-rose-500 mt-0.5">&bull;</span>
                                    <span>{risk}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                                Compliance Scope
                              </h4>
                              <p className="text-xs text-[#6b8699] dark:text-[#719bb5]">
                                Action adheres cleanly to standard exemptions without additional conditional covenants.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Applicable Clauses */}
                      {item.applicable_clauses && item.applicable_clauses.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                            Referenced Legal Clauses
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.applicable_clauses.map((clause, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-mono px-3 py-1 rounded-lg border bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#26ccf0]"
                              >
                                {clause}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Hash & Action Buttons */}
                      <div className="pt-4 border-t border-[#d2e4f0] dark:border-[#003d66] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 max-w-full">
                          <span className="text-xs font-mono font-medium text-[#6b8699] dark:text-[#719bb5]">
                            Action Hash:
                          </span>
                          <span className="text-xs font-mono text-[#002139] dark:text-[#26ccf0] truncate max-w-[200px] sm:max-w-[340px]">
                            {item.action_hash}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(item.action_hash, e)}
                            className="p-1 rounded text-[#26ccf0] hover:bg-[#26ccf0]/10"
                            title="Copy Hash"
                          >
                            {copiedHash === item.action_hash ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          {onSelectActionHash && (
                            <button
                              type="button"
                              onClick={() => onSelectActionHash(item.action_hash)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
                            >
                              <span>Test in Playground</span>
                              <ArrowRight className="w-3.5 h-3.5 text-[#26ccf0]" />
                            </button>
                          )}

                          {item.tx_hash && (
                            <a
                              href="https://studio-dev.genlayer.com"
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-[#26ccf0] hover:underline"
                            >
                              <span>Explorer</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
