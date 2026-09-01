"use client";

import { useState } from "react";
import { Search, ChevronDown, HelpCircle, X, MessageCircleQuestion } from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  tag: string;
}

const FAQS: FAQItem[] = [
  {
    id: "eligibility-checkin",
    question: "Who is eligible to participate and what should I bring for check-in?",
    answer:
      "Euphoria 2026 is open to all undergraduate and postgraduate students from any recognized college or university across India. During on-campus check-in, you must present your valid College ID card along with your Euphoria registration receipt / QR pass.",
    tag: "Eligibility & ID",
  },
  {
    id: "pass-event-limit",
    question: "What does the ₹200 Delegate Pass cover, and can I register for extra events?",
    answer:
      "The ₹200 Delegate Pass covers full campus entry for both days (September 25 & 26) and allows you to choose up to 2 competitions across any of the 14 academic schools. Each participant is strictly limited to 2 competitions.",
    tag: "₹200 Pass & Limits",
  },
  {
    id: "team-events",
    question: "How do team competitions work (e.g., Hackathon, Robotics, Project Expo)?",
    answer:
      "Every team member must register individually with their own ₹200 Delegate Pass and select the event. When you arrive at the competition hall on event day, submit your team members list directly to the event coordinator. You can also team up with other registered participants at the venue if needed.",
    tag: "Team Formation",
  },
  {
    id: "accommodation",
    question: "How does 4-sharing hostel accommodation work for outstation students?",
    answer:
      "During pass checkout, choose 'Need Accommodation' (Yes / No). Outstation delegates will be allotted comfortable 4-sharing campus hostel rooms. The nominal room fee is collected in-person directly at the college registration desk upon arrival.",
    tag: "4-Sharing Hostel",
  },
  {
    id: "food-meals",
    question: "Is lunch provided during the festival?",
    answer:
      "Lunch is provided for participants who request campus accommodation. All other delegates can access the university cafeterias and food courts on campus, and must arrange their own transport and meals.",
    tag: "Food & Stay",
  },
  {
    id: "spot-registration",
    question: "Is spot registration available at the venue on event days?",
    answer:
      "Yes, spot registration will be open at the campus registration counter on September 25 & 26 for limited slots on a first-come, first-served basis. Online pre-registration is advised to ensure your preferred event slots.",
    tag: "Spot Registration",
  },
  {
    id: "physical-certificates",
    question: "Will all participants receive physical certificates?",
    answer:
      "Yes. Every participant who attends and competes in their registered event will receive an official physical Certificate of Participation issued on campus by Kalasalingam Academy of Research and Education (KARE).",
    tag: "Physical Certificates",
  },
  {
    id: "cash-prize-payout",
    question: "How and when are cash prizes distributed to winners?",
    answer:
      "Cash prizes are handed over immediately to the winners in Cash or transferred via instant UPI at the exact moment the winners are announced on stage — no delayed cheques.",
    tag: "Instant Cash / UPI",
  },
  {
    id: "venue-dates",
    question: "When and where is Euphoria 2026 taking place?",
    answer:
      "Euphoria 2026 takes place on September 25 & 26, 2026 at the Kalasalingam Academy of Research and Education (KARE) Campus, Anand Nagar, Krishnankoil, Srivilliputhur, Tamil Nadu.",
    tag: "Venue & Dates",
  },
];

export function FAQInteractive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>("eligibility-checkin");

  const filteredFaqs = FAQS.filter((faq) => {
    return (
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Clean Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search FAQs (e.g., pass, ₹200, team, accommodation, food, certificate, cash prize)..."
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 shadow-xs font-sans transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* FAQ Accordion Items */}
      <div className="space-y-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-white border-primary/40 shadow-sm ring-1 ring-primary/10"
                    : "bg-white/95 border-slate-200/90 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <button
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 group cursor-pointer"
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                        {faq.tag}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug group-hover:text-primary transition-colors">
                      {faq.question}
                    </h3>
                  </div>

                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                      isOpen
                        ? "bg-primary text-white rotate-180 shadow-xs"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    <p className="pt-3.5">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 rounded-2xl bg-white border border-slate-200 p-6 space-y-2">
            <HelpCircle className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No questions found</p>
            <p className="text-xs text-slate-400">
              Try searching with terms like "pass", "team", "hostel", "food", or "certificate"
            </p>
          </div>
        )}
      </div>

      {/* Support Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200/80 text-xs">
        <div className="flex items-center gap-2.5 text-slate-700">
          <MessageCircleQuestion className="h-4 w-4 text-primary shrink-0" />
          <span>Have more questions regarding event guidelines or rules?</span>
        </div>
        <a
          href="mailto:euphoria@klu.ac.in"
          className="font-bold text-primary hover:text-primary-dark hover:underline"
        >
          Contact Helpdesk &rarr;
        </a>
      </div>
    </div>
  );
}
