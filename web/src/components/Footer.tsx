"use client";

import React from "react";
import Logo from "./Logo";
import { Scale, Globe, Shield, ExternalLink, Github } from "lucide-react";

export default function Footer({
  statuteAddress,
  consumerAddress,
}: {
  statuteAddress: string;
  consumerAddress: string;
}) {
  return (
    <footer className="mt-20 border-t transition-colors duration-200 bg-[#f5f9fc] border-[#d2e4f0] dark:bg-[#001525] dark:border-[#003d66]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <Logo size={36} showText={true} />
            <p className="mt-4 text-xs leading-relaxed max-w-md text-[#3b5a70] dark:text-[#b0d2e8]">
              Statute is a decentralized regulatory compliance adjudication protocol on GenLayer.
              Independent validators fetch statutory guidance directly from official government
              registers and render objective consensus verdicts with verifiable expiration windows.
            </p>
            <div className="mt-4 flex items-center gap-3 text-xs text-[#6b8699] dark:text-[#719bb5]">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#26ccf0]" />
                <span>Zero Gas Submitters</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#26ccf0]" />
                <span>GenLayer Consensus</span>
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-[#002139] dark:text-white">
              Intelligent Contracts
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-[#6b8699] dark:text-[#719bb5] block text-[10px] uppercase">
                  Statute Adjudicator
                </span>
                <a
                  href={`https://studio-dev.genlayer.com`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#26ccf0] hover:underline truncate block"
                >
                  {statuteAddress}
                </a>
              </div>
              <div className="pt-1">
                <span className="text-[#6b8699] dark:text-[#719bb5] block text-[10px] uppercase">
                  Regulated Consumer
                </span>
                <a
                  href={`https://studio-dev.genlayer.com`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#26ccf0] hover:underline truncate block"
                >
                  {consumerAddress}
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-[#002139] dark:text-white">
              Ecosystem Links
            </h4>
            <ul className="space-y-2 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              <li>
                <a
                  href="https://studio-dev.genlayer.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-[#26ccf0] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-[#26ccf0]" />
                  <span>GenLayer Studio Network</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-[#6b8699]" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/dotmantissa/statute"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-[#26ccf0] transition-colors"
                >
                  <Github className="w-3.5 h-3.5 text-[#26ccf0]" />
                  <span>GitHub Repository</span>
                  <ExternalLink className="w-3 h-3 ml-auto text-[#6b8699]" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#d2e4f0] dark:border-[#003d66] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6b8699] dark:text-[#719bb5] gap-4">
          <div>
            &copy; {new Date().getFullYear()} Statute Protocol. Built on GenLayer Intelligent Contracts.
          </div>
          <div className="flex items-center gap-4">
            <span>Electric Cyan and Deep Navy</span>
            <span>&bull;</span>
            <span>Chain ID 61997</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
