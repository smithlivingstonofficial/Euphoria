"use client";

import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  CreditCard,
  Building,
  Sparkles,
  Printer,
  BedDouble,
  GraduationCap,
  Trophy,
  Filter,
  Calendar,
  Layers,
  ArrowDownToLine,
  Phone,
  Mail,
  Search,
} from "lucide-react";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { getEventSchedule } from "@/lib/schedule";
import { parseEventMetadata } from "@/components/events/event-catalog-explorer";

interface RegistrationItem {
  id: string;
  slot_number?: number;
  registration_code: string;
  status: string;
  payment_status: string;
  created_at: string;
  needs_accommodation?: boolean;
  pass?: {
    id: string;
    pass_code: string;
    pass_tier: string;
    amount_paid: number;
    slots_used?: number;
    status: string;
  } | null;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    mobile_number?: string;
    gender?: string;
    participant_type?: "internal" | "external";
    college_name?: string;
    department?: string;
    course?: string;
    year_of_study?: number;
    register_number?: string;
    city?: string;
    needs_accommodation?: boolean;
  } | null;
  event?: {
    id: string;
    name: string;
    is_pro_event?: boolean;
    registration_fee?: number;
    event_date?: string;
    start_time?: string;
    end_time?: string;
    venue?: string;
    school_or_dept?: string;
    category?: {
      name: string;
    } | null;
  } | null;
  attendance?: Array<{
    id: string;
    scanned_at: string;
    scan_method: string;
  }>;
}

interface EventItem {
  id: string;
  name: string;
  slug?: string;
  short_description?: string;
  description?: string;
  school_or_dept?: string;
  venue?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  registration_fee?: number;
  participant_limit?: number;
  is_pro_event?: boolean;
  status: string;
  rules?: string | string[];
  category?: {
    id?: string;
    name: string;
    slug?: string;
  } | null;
  registrations?: Array<{
    id: string;
    status: string;
    payment_status: string;
    slot_number?: number;
  }>;
}

interface OrderItem {
  id: string;
  orderNumber: string;
  amount: number;
  status: "paid" | "pending" | "failed" | "refunded";
  provider: string;
  createdAt: string;
  metadata?: any;
  user?: {
    id: string;
    fullName: string;
    email: string;
    mobileNumber: string;
    participantType: string;
    collegeName: string;
    department: string;
    registerNumber: string;
    city: string;
  };
  pass?: {
    passCode: string;
    passTier: string;
    status: string;
  } | null;
}

interface CoordinatorAssignment {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    mobile_number?: string;
    register_number?: string;
    department?: string;
  };
  event?: {
    id: string;
    name: string;
    school_or_dept?: string;
  };
}

interface ReportsExporterProps {
  registrations: RegistrationItem[];
  events: EventItem[];
  orders: OrderItem[];
  coordinators: {
    staffAssignments: CoordinatorAssignment[];
    studentAssignments: CoordinatorAssignment[];
  };
}

export function ReportsExporter({
  registrations,
  events,
  orders,
  coordinators,
}: ReportsExporterProps) {
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "paid" | "unpaid">("paid");
  const [participantFilter, setParticipantFilter] = useState<"all" | "internal" | "external">("all");
  const [coordinatorRoleFilter, setCoordinatorRoleFilter] = useState<"all" | "staff" | "student">("all");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Helper for generating and triggering UTF-8 BOM CSV downloads
  const downloadCSV = (
    filename: string,
    headers: string[],
    rows: (string | number | undefined | null | boolean)[][]
  ) => {
    const escapeCSV = (val: string | number | undefined | null | boolean) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent =
      "\uFEFF" +
      [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Top KPI Metrics
  const metrics = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status === "paid");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const uniqueUserIds = new Set(registrations.map((r) => r.user?.id).filter(Boolean));
    const accommodationCount = registrations.filter((r) => r.needs_accommodation).length;
    const totalStaff = coordinators.staffAssignments.length;
    const totalStudents = coordinators.studentAssignments.length;

    return {
      totalRevenue,
      paidOrdersCount: paidOrders.length,
      totalOrdersCount: orders.length,
      uniqueUsersCount: uniqueUserIds.size || registrations.length,
      totalEventsCount: events.length,
      accommodationCount,
      totalCoordinatorsCount: totalStaff + totalStudents,
    };
  }, [orders, registrations, events, coordinators]);

  // 1. Financial Revenue & Easebuzz Payment Audit CSV
  const exportFinancialAuditCSV = () => {
    let filteredOrders = orders;
    if (orderStatusFilter === "paid") {
      filteredOrders = orders.filter((o) => o.status === "paid");
    } else if (orderStatusFilter === "unpaid") {
      filteredOrders = orders.filter((o) => o.status !== "paid");
    }

    const headers = [
      "S.No",
      "Order Reference Number",
      "Payment Gateway",
      "Easebuzz Transaction ID (txnid)",
      "Easebuzz Payment ID (easepayid)",
      "Delegate Full Name",
      "Registered Email",
      "Mobile Phone Number",
      "Delegate Pass Code",
      "Pass Tier",
      "Student Register Number (UDF6)",
      "Audit Purpose Key (UDF7)",
      "Participant Category",
      "College / University",
      "Department",
      "City / Location",
      "Gross Amount (INR)",
      "Needs Accommodation",
      "Transaction Status",
      "Order Timestamp",
    ];

    const rows = filteredOrders.map((ord, idx) => {
      const u = ord.user;
      const meta = ord.metadata || {};
      const txnid = meta.txnid || meta.txnid_sub || ord.orderNumber || "";
      const easepayid = meta.easepayid || meta.raw_payment_response?.easepayid || "";
      const udf6 = meta.udf6 || u?.registerNumber || "";
      const udf7 = meta.udf7 || "Euphoria 2026";
      const passTier =
        ord.pass?.passTier === "pro"
          ? "Euphoria 2026 Flagship Pass"
          : "Euphoria 2026 Regular Pass";
      const needsAcc =
        meta.needs_accommodation === true ||
        meta.needs_accommodation === "true" ||
        Boolean(meta.accommodation_requested);

      return [
        idx + 1,
        ord.orderNumber,
        ord.provider?.toUpperCase() || "EASEBUZZ",
        txnid,
        easepayid,
        u?.fullName || "Candidate",
        u?.email || "",
        u?.mobileNumber || "",
        ord.pass?.passCode || "N/A",
        passTier,
        udf6,
        udf7,
        u?.participantType === "internal" ? "KARE Internal" : "External University",
        u?.collegeName || (u?.participantType === "internal" ? "Kalasalingam Academy of Research and Education" : ""),
        u?.department || "",
        u?.city || "",
        ord.amount || 0,
        needsAcc ? "YES" : "NO",
        ord.status.toUpperCase(),
        ord.createdAt,
      ];
    });

    downloadCSV(
      `Euphoria_2026_Financial_Audit_${orderStatusFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // 2. Coordinators Roster CSV (Faculty & Student)
  const exportCoordinatorsCSV = () => {
    const list: Array<{
      role: string;
      name: string;
      email: string;
      mobile: string;
      registerNo?: string;
      event: string;
      school: string;
      source: string;
      createdAt: string;
    }> = [];

    // Add Staff Assignments
    if (coordinatorRoleFilter === "all" || coordinatorRoleFilter === "staff") {
      coordinators.staffAssignments.forEach((s) => {
        const u = s.user;
        const e = s.event;
        list.push({
          role: "Faculty / Staff Coordinator",
          name: u?.full_name || "Faculty In-Charge",
          email: u?.email || "",
          mobile: u?.mobile_number || "",
          registerNo: "",
          event: e?.name || "General Track",
          school: e?.school_or_dept || u?.department || "KARE",
          source: s.id.startsWith("sheet_") ? "Department Roster" : "Platform Role Assignment",
          createdAt: s.created_at || "",
        });
      });
    }

    // Add Student Assignments
    if (coordinatorRoleFilter === "all" || coordinatorRoleFilter === "student") {
      coordinators.studentAssignments.forEach((st) => {
        const u = st.user;
        const e = st.event;
        list.push({
          role: "Student Coordinator",
          name: u?.full_name || "Student In-Charge",
          email: u?.email || "",
          mobile: u?.mobile_number || "",
          registerNo: u?.register_number || "",
          event: e?.name || "General Track",
          school: e?.school_or_dept || u?.department || "KARE",
          source: "Platform Role Assignment",
          createdAt: st.created_at || "",
        });
      });
    }

    const headers = [
      "S.No",
      "Role Designation",
      "Coordinator Full Name",
      "Email Address",
      "Mobile Contact Number",
      "Student Register Number",
      "Assigned Competition / Event",
      "Academic School / Department",
      "Roster Source",
      "Assignment Timestamp",
    ];

    const rows = list.map((item, idx) => [
      idx + 1,
      item.role,
      item.name,
      item.email,
      item.mobile,
      item.registerNo || "N/A",
      item.event,
      item.school,
      item.source,
      item.createdAt,
    ]);

    downloadCSV(
      `Euphoria_2026_Coordinators_Roster_${coordinatorRoleFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // 3. Master Participants & Delegates Directory CSV
  const exportMasterParticipantsCSV = () => {
    // Group registrations by user ID to combine Slot 1 and Slot 2
    const userRegsMap = new Map<string, { user: any; pass: any; slot1?: any; slot2?: any; needsAcc: boolean }>();

    registrations.forEach((r) => {
      const u = r.user;
      if (!u || !u.id) return;

      let entry = userRegsMap.get(u.id);
      if (!entry) {
        entry = {
          user: u,
          pass: r.pass,
          needsAcc: Boolean(r.needs_accommodation || u.needs_accommodation),
        };
        userRegsMap.set(u.id, entry);
      }

      if (r.slot_number === 2) {
        entry.slot2 = r;
      } else {
        entry.slot1 = r;
      }

      if (r.needs_accommodation) {
        entry.needsAcc = true;
      }
    });

    let participantList = Array.from(userRegsMap.values());

    if (participantFilter === "internal") {
      participantList = participantList.filter((p) => p.user?.participant_type === "internal");
    } else if (participantFilter === "external") {
      participantList = participantList.filter((p) => p.user?.participant_type !== "internal");
    }

    const headers = [
      "S.No",
      "Delegate Pass Code",
      "Pass Tier",
      "Full Name",
      "Email Address",
      "Mobile Phone Number",
      "Participant Type",
      "College / University Name",
      "City / Location",
      "Degree / Course",
      "Academic Department",
      "Year of Study",
      "Student Register / Roll Number",
      "Slot 1 Chosen Event",
      "Slot 1 Organizing School",
      "Slot 1 Attendance Status",
      "Slot 2 Chosen Event",
      "Slot 2 Organizing School",
      "Slot 2 Attendance Status",
      "Total Competitions Claimed",
      "Needs Campus Accommodation",
    ];

    const rows = participantList.map((entry, idx) => {
      const u = entry.user;
      const pass = entry.pass;
      const s1 = entry.slot1;
      const s2 = entry.slot2;

      const s1Att = (s1?.attendance || []).length > 0 ? "Checked In" : s1 ? "Pending" : "None";
      const s2Att = (s2?.attendance || []).length > 0 ? "Checked In" : s2 ? "Pending" : "None";

      const passTier =
        pass?.pass_tier === "pro"
          ? "Euphoria 2026 Flagship Pass"
          : pass?.pass_tier
          ? "Euphoria 2026 Regular Pass"
          : "Festival Pass";

      const totalSlots = (s1 ? 1 : 0) + (s2 ? 1 : 0);

      return [
        idx + 1,
        pass?.pass_code || s1?.registration_code || "N/A",
        passTier,
        u?.full_name || "Delegate",
        u?.email || "",
        u?.mobile_number || "",
        u?.participant_type === "internal" ? "KARE Internal Student" : "External University Delegate",
        u?.college_name || (u?.participant_type === "internal" ? "Kalasalingam Academy of Research and Education" : "External Institution"),
        u?.city || "",
        u?.course || "",
        u?.department || "",
        u?.year_of_study ? `${u.year_of_study} Year` : "",
        u?.register_number || "",
        s1?.event?.name || "Not Selected",
        s1?.event?.school_or_dept || "KARE",
        s1Att,
        s2?.event?.name || "Not Selected",
        s2?.event?.school_or_dept || "KARE",
        s2Att,
        totalSlots,
        entry.needsAcc ? "YES" : "NO",
      ];
    });

    downloadCSV(
      `Euphoria_2026_Master_Participants_${participantFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // 4. Event-Wise Rosters & Physical Attendance Sheet CSV
  const exportEventAttendanceCSV = () => {
    let targetRegs = registrations;
    let eventNameLabel = "All_Competitions_Combined";

    if (selectedEventId !== "all") {
      targetRegs = targetRegs.filter((r) => r.event?.id === selectedEventId);
      const chosen = events.find((e) => e.id === selectedEventId);
      if (chosen) {
        eventNameLabel = chosen.name.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 30);
      }
    }

    const headers = [
      "S.No",
      "Event Name",
      "School / Department",
      "Venue Location",
      "Delegate Pass Code",
      "Slot Number",
      "Participant Full Name",
      "College / University",
      "Department",
      "Degree / Year",
      "Mobile Contact Number",
      "Email Address",
      "Check-In Status",
      "Check-In Timestamp",
      "Check-In Method",
      "Physical Signature / Verification Remarks",
    ];

    const rows = targetRegs.map((r, idx) => {
      const u = r.user;
      const e = r.event;
      const att = (r.attendance || [])[0];

      return [
        idx + 1,
        e?.name || "Competition",
        e?.school_or_dept || "KARE",
        e?.venue || "Campus Hall",
        r.registration_code || r.pass?.pass_code || "",
        `Slot ${r.slot_number || 1}`,
        u?.full_name || "Participant",
        u?.college_name || (u?.participant_type === "internal" ? "KARE" : "External College"),
        u?.department || "",
        u?.course ? `${u.course} ${u.year_of_study ? `(${u.year_of_study}Y)` : ""}` : "",
        u?.mobile_number || "",
        u?.email || "",
        att ? "Checked In" : "Pending Check-In",
        att?.scanned_at || "",
        att?.scan_method || "",
        "", // Blank for physical desk signature
      ];
    });

    downloadCSV(
      `Euphoria_2026_Attendance_Sheet_${eventNameLabel}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // 5. Campus Accommodation & Hospitality Checklist CSV
  const exportAccommodationCSV = () => {
    // Collect all unique participants requiring accommodation
    const accList: Array<{
      passCode: string;
      passTier: string;
      name: string;
      email: string;
      mobile: string;
      college: string;
      city: string;
      participantType: string;
      event1: string;
      event2: string;
    }> = [];

    const processedUsers = new Set<string>();

    registrations.forEach((r) => {
      const u = r.user;
      if (!u || !u.id) return;
      if (!r.needs_accommodation && !u.needs_accommodation) return;

      if (!processedUsers.has(u.id)) {
        processedUsers.add(u.id);

        const userRegs = registrations.filter((reg) => reg.user?.id === u.id);
        const s1 = userRegs.find((reg) => reg.slot_number === 1) || userRegs[0];
        const s2 = userRegs.find((reg) => reg.slot_number === 2);

        accList.push({
          passCode: r.pass?.pass_code || r.registration_code,
          passTier:
            r.pass?.pass_tier === "pro"
              ? "Euphoria 2026 Flagship Pass"
              : "Euphoria 2026 Regular Pass",
          name: u.full_name || "Delegate",
          email: u.email || "",
          mobile: u.mobile_number || "",
          college: u.college_name || (u.participant_type === "internal" ? "KARE" : "External College"),
          city: u.city || "",
          participantType: u.participant_type === "internal" ? "Internal" : "External University",
          event1: s1?.event?.name || "General Track",
          event2: s2?.event?.name || "None",
        });
      }
    });

    const headers = [
      "S.No",
      "Delegate Pass Code",
      "Pass Tier",
      "Full Name",
      "Mobile Contact Number",
      "Registered Email",
      "Participant Category",
      "Home Institution / College",
      "City / Native State",
      "Registered Event 1",
      "Registered Event 2",
      "Festival Arrival Window",
      "Tariff Status",
      "Allotted Hostel Block / Room",
      "Warden / Desk In-Charge Signature",
    ];

    const rows = accList.map((item, idx) => [
      idx + 1,
      item.passCode,
      item.passTier,
      item.name,
      item.mobile,
      item.email,
      item.participantType,
      item.college,
      item.city,
      item.event1,
      item.event2,
      "24 Sept Evening / 25 Sept Morning",
      "INR 250/night payable at Desk",
      "", // Blank for room allotment
      "", // Blank for signature
    ]);

    downloadCSV(
      `Euphoria_2026_Accommodation_Desk_Checklist_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // 6. Master Competitions & Events Catalog CSV (All 61 Events)
  const exportMasterEventsCSV = () => {
    const headers = [
      "S.No",
      "Event Name",
      "Slug",
      "School / Academic Department",
      "Category / Track",
      "Tier",
      "Event Date",
      "Start Date",
      "End Date",
      "Start Time",
      "End Time",
      "Is 2-Day Event",
      "Schedule Label",
      "Venue Location",
      "Max Capacity",
      "Confirmed Registrations",
      "Slot 1 First-Choice Count",
      "Available Seats",
      "Fill Percentage",
      "Status",
      "Coordinator Names",
      "Coordinator Mobiles",
      "Coordinator Emails",
      "WhatsApp Group Link",
      "Brochure PDF URL",
      "Description",
      "Rules & Guidelines",
    ];

    const rows = events.map((evt, idx) => {
      const sched = getEventSchedule(evt);
      const regCount = (evt.registrations || []).length;
      const firstSlotCount = (evt.registrations || []).filter((r) => r.slot_number === 1).length;
      const limit = evt.participant_limit || 100;
      const available = Math.max(0, limit - regCount);
      const fillPct = Math.min(100, Math.round((regCount / limit) * 100));

      const meta = parseEventMetadata({
        ...evt,
        school_or_dept: evt.school_or_dept || "",
        venue: evt.venue || "",
        event_date: evt.event_date || "",
        start_time: evt.start_time || "",
        end_time: evt.end_time || "",
        registration_fee: evt.registration_fee || 0,
        participant_limit: limit,
        is_pro_event: Boolean(evt.is_pro_event),
      } as any);

      return [
        idx + 1,
        evt.name,
        evt.slug || "",
        evt.school_or_dept || "KARE",
        evt.category?.name || "General Track",
        evt.is_pro_event ? "Flagship" : "Regular",
        evt.event_date || sched.startDate,
        sched.startDate,
        sched.endDate,
        sched.startTime,
        sched.endTime,
        sched.isTwoDay ? "YES" : "NO",
        sched.displaySchedule,
        evt.venue || "Campus Venue",
        limit,
        regCount,
        firstSlotCount,
        available,
        `${fillPct}%`,
        evt.status,
        meta.names || (evt as any).coordinator_names || "",
        meta.mobiles || (evt as any).coordinator_mobiles || "",
        meta.emails || (evt as any).coordinator_emails || "",
        meta.whatsappLink || (evt as any).whatsapp_link || "",
        meta.brochureUrl || (evt as any).brochure_url || "",
        meta.cleanDescription || evt.description || "",
        Array.isArray((evt as any).rules) ? (evt as any).rules.join(" | ") : (evt as any).rules || "",
      ];
    });

    downloadCSV(
      `Euphoria_2026_Events_Master_Catalog_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // 7. Download All 5 Core Spreadsheets in One Click
  const downloadAllReportsBundle = async () => {
    setIsDownloadingAll(true);
    try {
      exportFinancialAuditCSV();
      await new Promise((r) => setTimeout(r, 450));
      exportCoordinatorsCSV();
      await new Promise((r) => setTimeout(r, 450));
      exportMasterParticipantsCSV();
      await new Promise((r) => setTimeout(r, 450));
      exportAccommodationCSV();
      await new Promise((r) => setTimeout(r, 450));
      exportMasterEventsCSV();
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Revenue
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {formatCurrency(metrics.totalRevenue)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {metrics.paidOrdersCount} Paid Orders
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Delegates
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {metrics.uniqueUsersCount}
          </p>
          <span className="text-[10px] text-slate-500">
            Registered Attendees
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Competitions
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {metrics.totalEventsCount}
          </p>
          <span className="text-[10px] text-indigo-600 font-semibold">
            12 Two-Day Events
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Coordinators
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {metrics.totalCoordinatorsCount}
          </p>
          <span className="text-[10px] text-slate-500">
            Faculty &amp; Students
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Hostel Requests
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {metrics.accommodationCount}
          </p>
          <span className="text-[10px] text-amber-600 font-semibold">
            Campus Stay Desk
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Batch Download
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              All 5 Core Spreadsheets
            </p>
          </div>
          <button
            onClick={downloadAllReportsBundle}
            disabled={isDownloadingAll}
            className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span>{isDownloadingAll ? "Downloading..." : "Export All (.csv)"}</span>
          </button>
        </div>
      </div>

      {/* Main Reports Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Financial & Easebuzz Audit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                Accounts &amp; Audit
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Financial Revenue &amp; Easebuzz Audit
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Order IDs, Easebuzz transaction IDs (txnid), payment IDs (easepayid), UDF6 (student ID), UDF7 audit key, pass tiers, and amounts.
              </p>
            </div>

            {/* Filter */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Transaction Status Filter:
              </label>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="paid">Paid &amp; Confirmed Orders Only ({metrics.paidOrdersCount})</option>
                <option value="all">All Transactions ({orders.length})</option>
                <option value="unpaid">Pending / Failed Transactions Only</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportFinancialAuditCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Financial Audit CSV</span>
            </button>
          </div>
        </div>

        {/* Card 2: Faculty & Student Coordinators Directory */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                Campus Operations
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Coordinators Directory (Staff &amp; Students)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Contact roster of all faculty organizers and student leads across departments, event venues, mobile numbers, and emails.
              </p>
            </div>

            {/* Filter */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Coordinator Role Filter:
              </label>
              <select
                value={coordinatorRoleFilter}
                onChange={(e) => setCoordinatorRoleFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Coordinators ({metrics.totalCoordinatorsCount})</option>
                <option value="staff">Faculty / Staff Coordinators ({coordinators.staffAssignments.length})</option>
                <option value="student">Student Coordinators ({coordinators.studentAssignments.length})</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportCoordinatorsCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Coordinators Directory CSV</span>
            </button>
          </div>
        </div>

        {/* Card 3: Master Participants & Delegates Directory */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                Master Roster
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Master Participants Directory
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Aggregated per delegate: pass codes, Slot 1 &amp; Slot 2 event selections, institution name, contact numbers, and year of study.
              </p>
            </div>

            {/* Filter */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Delegate Origin Filter:
              </label>
              <select
                value={participantFilter}
                onChange={(e) => setParticipantFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Attendees ({metrics.uniqueUsersCount})</option>
                <option value="external">External University Delegates</option>
                <option value="internal">KARE Internal Students</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportMasterParticipantsCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Master Delegates CSV</span>
            </button>
          </div>
        </div>

        {/* Card 4: Event-Wise Attendance & Signature Sheet */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Printer className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100">
                Physical Desk Verification
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Event Rosters &amp; Attendance Sheets
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Printable rosters with scan check-in timestamps and physical blank signature columns for competition hall invigilators.
              </p>
            </div>

            {/* Event Dropdown */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Select Competition:
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Competitions Combined ({registrations.length} entries)</option>
                {events.map((evt) => {
                  const regCount = (evt.registrations || []).length;
                  return (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} ({regCount} registered)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportEventAttendanceCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Attendance Sheet CSV</span>
            </button>
          </div>
        </div>

        {/* Card 5: Campus Accommodation Desk Checklist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BedDouble className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100">
                Hospitality &amp; Hostels
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Campus Accommodation Checklist
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Filtered roster of outstation delegates requesting hostel stay, arrival dates, contact details, and desk tariff collection remarks.
              </p>
            </div>

            <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-2.5 text-[11px] text-amber-800 space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Requested Stays:</span>
                <span>{metrics.accommodationCount} Candidates</span>
              </div>
              <p className="text-[10px] text-amber-700">
                Desk fee: ₹250/night to be verified upon arrival.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportAccommodationCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Accommodation CSV</span>
            </button>
          </div>
        </div>

        {/* Card 6: Master Events & Competitions Catalog (All 61 Events) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-100">
                All 61 Competitions
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Master Competitions Catalog
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Exhaustive export of all 61 competitions with latest descriptions, multi-day schedules, schools, categories, venues, coordinators, and rules.
              </p>
            </div>

            <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-2.5 text-[11px] text-rose-800 space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Total Cataloged Events:</span>
                <span>{events.length} Events</span>
              </div>
              <p className="text-[10px] text-rose-700">
                Includes 12 two-day multi-day schedule mappings.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportMasterEventsCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Events Master CSV ({events.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
