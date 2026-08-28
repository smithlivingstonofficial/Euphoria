"use client";

import { useState } from "react";
import { Search, ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "pass" | "events" | "logistics" | "general";
}

const FAQS: FAQItem[] = [
  {
    id: "eligibility",
    question: "Who is eligible to participate in Euphoria 2026?",
    answer:
      "Euphoria 2026 is open to all bonafide undergraduate and postgraduate students (B.E/B.Tech, B.Sc, BCA, MCA, M.Tech, MBA, Architecture, Law, Arts, Pharmacy, and Allied Health Sciences) from any recognized college or university in India. Valid college ID cards must be presented during check-in.",
    category: "general",
  },
  {
    id: "pass-slots",
    question: "How does the All-Access Delegate Pass work with 2 event slots?",
    answer:
      "Your Delegate Pass grants you entry to the university festival grounds, keynote sessions, hospitality, and up to 2 free competition slots across Day 1 & Day 2 from our catalog of 61 events. You can select your two events immediately upon getting your pass or configure them prior to registration closing.",
    category: "pass",
  },
  {
    id: "team-size",
    question: "How do team events work (e.g., Hackathons and Robotics)?",
    answer:
      "For team competitions like the 24-Hour Hackathon (2-4 members) or Robo Deathmatch (2-4 members), each team member needs their own valid Delegate Pass. The team leader creates the team code during event registration and shares it with their teammates to join.",
    category: "events",
  },
  {
    id: "accommodation",
    question: "Is accommodation available for outstation participants?",
    answer:
      "Yes! Kalasalingam University provides affordable campus hostel accommodation and guest room arrangements for outstation participants arriving from other cities/states. Accommodation assistance details will be available on your participant dashboard upon pass confirmation.",
    category: "logistics",
  },
  {
    id: "certificates",
    question: "Will all participants receive certificates?",
    answer:
      "Yes. Every registered participant who attends their scheduled event will receive an official, digitally verifiable Certificate of Participation from Kalasalingam Academy of Research and Education (KARE). Winners and runners-up receive Merit Certificates and Cash Awards.",
    category: "events",
  },
  {
    id: "spot-registration",
    question: "Is spot registration available at the venue?",
    answer:
      "Online pre-registration is strongly advised as flagship events (such as the 24-Hr Hackathon and Drone Velocity Circuit) have strict lab and seat capacity caps. Limited spot registrations will only be available for non-capped competitions on a first-come, first-served basis.",
    category: "pass",
  },
  {
    id: "food-kit",
    question: "Are meals and delegate kits provided?",
    answer:
      "Yes! All registered delegates receive official festival badges, lanyards, delegate kits, lunch, and refreshments across the 2 festival days.",
    category: "logistics",
  },
];

const CATEGORIES = [
  { label: "[ ALL_QUESTIONS ]", value: "all" },
  { label: "[ DELEGATE_PASS ]", value: "pass" },
  { label: "[ COMPETITIONS ]", value: "events" },
  { label: "[ LOGISTICS & STAY ]", value: "logistics" },
  { label: "[ GENERAL ]", value: "general" },
];

export function FAQInteractive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openId, setOpenId] = useState<string | null>("eligibility");

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory =
      activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queries (e.g., pass, hackathon, food, certificate, accommodation)..."
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === c.value
                  ? "bg-slate-900 text-cyan-300 shadow-xs"
                  : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion Items in Pure Light Theme */}
      <div className="space-y-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-white border-primary/40 shadow-sm"
                    : "bg-white/90 border-slate-200/90 hover:bg-white"
                }`}
              >
                <button
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4"
                >
                  <span className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
                      isOpen
                        ? "bg-primary text-white rotate-180"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    <p className="pt-3">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 rounded-2xl bg-white border border-slate-200 p-6 space-y-2">
            <HelpCircle className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No questions matched your search</p>
            <p className="text-xs text-slate-400">Try searching for "pass", "team", "hackathon", or "food"</p>
          </div>
        )}
      </div>
    </div>
  );
}
