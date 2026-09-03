"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check, Sparkles } from "lucide-react";

export interface OptionGroup {
  category: string;
  options: string[];
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[] | OptionGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
  name?: string;
  id?: string;
  icon?: React.ReactNode;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  searchPlaceholder = "Search options...",
  disabled = false,
  className = "",
  hasError = false,
  name,
  id,
  icon,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options into groups or flat list
  const isGrouped = useMemo(() => {
    if (options.length === 0) return false;
    return typeof options[0] === "object" && "category" in options[0];
  }, [options]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Dynamic positioning: check if there's enough space below or flip upward
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 280 && spaceAbove > 280) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Keyboard close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Filtered results
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (!isGrouped) {
      const flatList = options as string[];
      if (!q) return [{ category: "", options: flatList }];
      const filtered = flatList.filter((opt) => opt.toLowerCase().includes(q));
      return [{ category: "", options: filtered }];
    }

    const groups = options as OptionGroup[];
    if (!q) return groups;

    return groups
      .map((g) => ({
        category: g.category,
        options: g.options.filter((opt) => opt.toLowerCase().includes(q)),
      }))
      .filter((g) => g.options.length > 0);
  }, [options, isGrouped, searchQuery]);

  const totalResultsCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.options.length, 0);
  }, [filteredGroups]);

  const handleSelect = (selectedOption: string) => {
    onChange(selectedOption);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for standard form serialization */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`group w-full flex items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-left text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
          hasError
            ? "border-rose-300 ring-4 ring-rose-500/15"
            : isOpen
            ? "border-indigo-600 ring-4 ring-indigo-500/15 shadow-sm bg-white"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/15"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : ""}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {icon && <span className="text-indigo-500/80 group-hover:text-indigo-600 shrink-0 transition-colors">{icon}</span>}
          <span
            className={`block truncate leading-tight ${
              !value ? "text-slate-400 font-normal" : "text-slate-900 font-medium"
            }`}
          >
            {value || placeholder}
          </span>
        </div>
        <div className="flex items-center pl-1 shrink-0">
          <ChevronDown
            className={`h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-full min-w-[280px] sm:min-w-[340px] rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-black/5 animate-in fade-in-0 zoom-in-98 duration-150 ${
            openUpward
              ? "bottom-[calc(100%+6px)] origin-bottom slide-in-from-bottom-2"
              : "top-[calc(100%+6px)] origin-top slide-in-from-top-1"
          }`}
        >
          {/* Search Input Bar */}
          <div className="relative mb-2 flex items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-indigo-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto overscroll-contain px-0.5 py-1 pb-3 text-xs sm:text-sm space-y-0.5">
            {totalResultsCount === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-xs font-medium text-slate-600 mb-1">No matching options found</p>
                <p className="text-[11px] text-slate-400 mb-3">Can&apos;t find what you are looking for?</p>
                <button
                  type="button"
                  onClick={() => handleSelect("Other")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Select &quot;Other&quot; to specify</span>
                </button>
              </div>
            ) : (
              filteredGroups.map((group, groupIdx) => (
                <div
                  key={group.category || groupIdx}
                  className={groupIdx > 0 ? "mt-2 pt-2 border-t border-slate-100" : ""}
                >
                  {group.category && (
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                      {group.category}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.options.map((option) => {
                      const isSelected = value === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSelect(option)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm transition-all duration-100 cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white font-medium shadow-xs"
                              : "text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-900"
                          }`}
                        >
                          <span className="truncate pr-2 leading-relaxed">{option}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-white ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
