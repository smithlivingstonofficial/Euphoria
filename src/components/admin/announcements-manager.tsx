"use client";

import { useState } from "react";
import {
  Megaphone,
  AlertTriangle,
  Info,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { createAnnouncementAdmin, deleteAnnouncementAdmin } from "@/actions/admin";
import { formatDate } from "@/lib/utils";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  urgency: "info" | "warning" | "urgent";
  is_published: boolean;
  created_at: string;
  event?: {
    id: string;
    name: string;
  } | null;
}

export function AnnouncementsManager({
  initialAnnouncements,
  eventsList,
}: {
  initialAnnouncements: AnnouncementItem[];
  eventsList: Array<{ id: string; name: string }>;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [urgency, setUrgency] = useState<"info" | "warning" | "urgent">("info");
  const [selectedEventId, setSelectedEventId] = useState("global");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await createAnnouncementAdmin({
      title,
      content,
      urgency,
      eventId: selectedEventId,
    });

    if (!res.success) {
      setErrorMessage(res.error || "Failed to create announcement");
      setIsLoading(false);
    } else {
      const targetEvent = eventsList.find((e) => e.id === selectedEventId);
      const newAnn: AnnouncementItem = {
        id: "ann-" + Date.now(),
        title,
        content,
        urgency,
        is_published: true,
        created_at: new Date().toISOString(),
        event: targetEvent ? { id: targetEvent.id, name: targetEvent.name } : null,
      };

      setAnnouncements((prev) => [newAnn, ...prev]);
      setIsLoading(false);
      setIsModalOpen(false);
      setTitle("");
      setContent("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this announcement?")) return;
    const res = await deleteAnnouncementAdmin(id);
    if (res.success) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert(res.error || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Live Festival Broadcasts &amp; Alerts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Announcements appear in real-time on participant dashboards and public discovery banners
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Announcements List Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {announcements.length > 0 ? (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      ann.urgency === "urgent"
                        ? "bg-rose-100 text-rose-700"
                        : ann.urgency === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-indigo-100 text-primary"
                    }`}
                  >
                    {ann.urgency === "urgent" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : ann.urgency === "warning" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          ann.urgency === "urgent"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : ann.urgency === "warning"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {ann.urgency}
                      </span>
                      {ann.event ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {ann.event.name}
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Global All
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                    <div className="text-[11px] text-slate-400">
                      Posted on {formatDate(ann.created_at)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(ann.id)}
                  title="Delete Announcement"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No announcements published yet.
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Broadcast Live Announcement
            </h3>

            {errorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Announcement Headline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Hackathon Final Round Venue Shifted to Lab 402"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as "info" | "warning" | "urgent")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
                  >
                    <option value="info">General Info</option>
                    <option value="warning">Important Warning</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
                  >
                    <option value="global">All Festival Participants</option>
                    {eventsList.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter full announcement details, timing updates, or instructions..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover disabled:opacity-50"
                >
                  {isLoading ? "Broadcasting..." : "Broadcast Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
