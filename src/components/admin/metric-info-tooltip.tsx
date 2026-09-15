"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle, Info, X } from "lucide-react";

export interface SubMetricInfo {
  label: string;
  value?: string | number;
  explanation: string;
}

interface MetricInfoTooltipProps {
  title: string;
  description: string;
  subMetrics?: SubMetricInfo[];
  contextNote?: string;
  align?: "left" | "center" | "right";
}

export function MetricInfoTooltip({
  title,
  description,
  subMetrics = [],
  contextNote,
}: MetricInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        title={`Click to see what ${title} means`}
        aria-label={`Information about ${title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="group/btn inline-flex items-center justify-center p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 transition-all cursor-pointer ml-0.5"
      >
        <HelpCircle className="h-3.5 w-3.5 transition-transform group-hover/btn:scale-110" />
      </button>

      {/* Modal Dialog (Light Theme) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-6 text-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Top Glow */}
            <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-indigo-50/80 blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-primary border border-indigo-100/80 shadow-2xs">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    {title}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Metric Definition &amp; Telemetry
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Primary Count Meaning */}
            <div className="mt-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Primary Count Meaning
              </div>
              <p className="text-xs leading-relaxed text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 font-medium">
                {description}
              </p>
            </div>

            {/* Sub-Metrics Breakdown */}
            {subMetrics.length > 0 && (
              <div className="mt-3.5 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Sub-Metrics Breakdown
                </div>
                <div className="space-y-2">
                  {subMetrics.map((sm, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-slate-50/60 p-3 border border-slate-200/80 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-slate-900 font-bold text-xs">
                        <span>{sm.label}</span>
                        {sm.value !== undefined && (
                          <span className="font-mono text-indigo-700 font-bold px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs">
                            {sm.value}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                        {sm.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context Note / Insight */}
            {contextNote && (
              <div className="mt-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 text-[11px] text-amber-950 leading-relaxed flex items-start gap-2.5 shadow-2xs">
                <div className="p-1 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Why does this count differ?
                  </span>
                  <span className="text-amber-800/90">{contextNote}</span>
                </div>
              </div>
            )}

            {/* Footer Action */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
