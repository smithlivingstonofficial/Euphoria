"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Trophy,
  ListChecks,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Star,
} from "lucide-react";
import { createEventAdmin, updateEventAdmin } from "@/actions/admin";

interface Category {
  id: string;
  name: string;
}

interface EventFormData {
  id?: string;
  categoryId: string;
  name: string;
  shortDescription: string;
  description: string;
  rules: string;
  schoolOrDept: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  registrationFee: number;
  participantLimit: number;
  minTeamSize: number;
  maxTeamSize: number;
  isProEvent?: boolean;
  status: string;
}

export function EventForm({
  categories,
  initialData,
  isEdit = false,
}: {
  categories: Category[];
  initialData?: Partial<EventFormData>;
  isEdit?: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId || (categories[0]?.id || "")
  );
  const [name, setName] = useState(initialData?.name || "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription || ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [rulesText, setRulesText] = useState(
    initialData?.rules || "1. Individual participation.\n2. Bring your own laptop.\n3. Decision of judges is final."
  );
  const [schoolOrDept, setSchoolOrDept] = useState(
    initialData?.schoolOrDept || "School of Computing (SCSE)"
  );
  const [venue, setVenue] = useState(initialData?.venue || "Auditorium / Lab 304");
  const [eventDate, setEventDate] = useState(
    initialData?.eventDate || "2026-09-18"
  );
  const [startTime, setStartTime] = useState(initialData?.startTime || "10:00");
  const [endTime, setEndTime] = useState(initialData?.endTime || "13:00");
  const [registrationFee, setRegistrationFee] = useState<number>(
    initialData?.registrationFee ?? 0
  );
  const [participantLimit, setParticipantLimit] = useState<number>(
    initialData?.participantLimit ?? 100
  );
  const [minTeamSize, setMinTeamSize] = useState<number>(
    initialData?.minTeamSize ?? 1
  );
  const [maxTeamSize, setMaxTeamSize] = useState<number>(
    initialData?.maxTeamSize ?? 1
  );
  const [isProEvent, setIsProEvent] = useState<boolean>(
    initialData?.isProEvent ?? false
  );
  const [status, setStatus] = useState(initialData?.status || "registration_open");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const rulesArray = rulesText
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const payload = {
      categoryId,
      name,
      shortDescription,
      description,
      rules: rulesArray,
      schoolOrDept,
      venue,
      eventDate,
      startTime,
      endTime,
      registrationFee: Number(registrationFee),
      participantLimit: Number(participantLimit),
      minTeamSize: Number(minTeamSize),
      maxTeamSize: Number(maxTeamSize),
      isProEvent,
      status,
    };

    let res;
    if (isEdit && initialData?.id) {
      res = await updateEventAdmin(initialData.id, payload);
    } else {
      res = await createEventAdmin(payload);
    }

    if (!res.success) {
      setErrorMessage(res.error || "Failed to save event");
      setIsLoading(false);
    } else {
      router.push("/admin/events");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          1. Basic Event Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CodeSprint Hackathon"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Track <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Short Tagline / Teaser <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="High-speed algorithmic problem-solving showdown across 3 rounds"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organizing School / Dept <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={schoolOrDept}
              onChange={(e) => setSchoolOrDept(e.target.value)}
              placeholder="School of Computing (SCSE)"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lifecycle Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
            >
              <option value="registration_open">Registration Open (Active)</option>
              <option value="published">Published (Upcoming)</option>
              <option value="registration_closed">Registration Closed</option>
              <option value="ongoing">Ongoing (Festival Day)</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft (Hidden)</option>
            </select>
          </div>
        </div>

        {/* Pro Event Tier Toggle */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-3">
          <input
            id="isProEvent"
            type="checkbox"
            checked={isProEvent}
            onChange={(e) => setIsProEvent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <label htmlFor="isProEvent" className="cursor-pointer select-none">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
              <Star className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
              <span>Mark as ⭐ PRO EVENT</span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
              Pro Events are flagship competitions. Participants can select at most 1 Pro Event per pass, and it MUST be selected as their first event choice.
            </p>
          </label>
        </div>
      </div>

      {/* Schedule, Venue & Fees */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          2. Schedule, Venue & Fees
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Start Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              End Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Venue / Lab Room <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. CSE Lab 4 / Main Auditorium"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registration Fee (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              required
              value={registrationFee}
              onChange={(e) => setRegistrationFee(Number(e.target.value))}
              placeholder="0 for free"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Seat Capacity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={participantLimit}
              onChange={(e) => setParticipantLimit(Number(e.target.value))}
              placeholder="100"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Rules & Detailed Description */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          3. Rules & Full Description
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Event Description & Overview <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the competition rounds, judgment criteria, and technologies allowed..."
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Rules & Guidelines (One per line) <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder="1. Each team must have 1-3 members.&#10;2. Plagiarism leads to disqualification.&#10;3. Internet access provided."
            className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 font-mono focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Cancel</span>
        </Link>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <span>Saving Event...</span>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{isEdit ? "Update Event" : "Publish Event"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
