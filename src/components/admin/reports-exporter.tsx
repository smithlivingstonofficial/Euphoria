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
  Banknote,
  FileCheck,
  Check,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { getEventSchedule } from "@/lib/schedule";
import { parseEventMetadata } from "@/components/events/event-catalog-explorer";
import type { AdminUserListItem } from "@/actions/admin";

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
    pincode?: string;
    school?: string;
    is_profile_completed?: boolean;
  } | null;
  event?: {
    id: string;
    name: string;
    slug?: string;
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
    gender?: string;
    participantType: string;
    collegeName: string;
    department: string;
    registerNumber: string;
    city: string;
    needsAccommodation?: boolean;
    registeredEvents?: Array<{
      slotNumber: number;
      eventName: string;
      schoolOrDept: string;
      venue: string;
    }>;
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
    venue?: string;
    event_date?: string;
    start_time?: string;
    end_time?: string;
  };
}

interface CashRequestItem {
  id: string;
  request_code?: string;
  requestCode?: string;
  user_id?: string;
  userId?: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  college_name?: string;
  collegeName?: string;
  register_number?: string;
  registerNumber?: string;
  department?: string;
  participant_type?: string;
  participantType?: string;
  selected_event_ids?: string[];
  pass_tier?: string;
  passTier?: string;
  total_amount?: number;
  totalAmount?: number;
  needs_accommodation?: boolean;
  needsAccommodation?: boolean;
  status: "pending" | "approved" | "rejected" | "cancelled";
  rejection_reason?: string;
  admin_notes?: string;
  issued_pass_code?: string;
  issued_order_id?: string;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  createdAt?: string;
}

interface ReportsExporterProps {
  registrations: RegistrationItem[];
  events: EventItem[];
  orders: OrderItem[];
  coordinators: {
    staffAssignments: CoordinatorAssignment[];
    studentAssignments: CoordinatorAssignment[];
  };
  users?: AdminUserListItem[];
  cashRequests?: CashRequestItem[];
}

export function ReportsExporter({
  registrations,
  events,
  orders,
  coordinators,
  users = [],
  cashRequests = [],
}: ReportsExporterProps) {
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "paid" | "unpaid" | "cash">("paid");
  const [participantFilter, setParticipantFilter] = useState<"all" | "internal" | "external" | "has_pass" | "registered_events">("all");
  const [accommodationFilter, setAccommodationFilter] = useState<"all" | "external" | "internal" | "male" | "female">("all");
  const [coordinatorRoleFilter, setCoordinatorRoleFilter] = useState<"all" | "staff" | "student">("all");
  const [cashStatusFilter, setCashStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  // Guarantee accurate registration counts per event by grouping registrations
  const eventsWithRegs = useMemo(() => {
    const regMap = new Map<string, RegistrationItem[]>();
    registrations.forEach((r) => {
      const eid = r.event?.id;
      if (eid) {
        const list = regMap.get(eid) || [];
        list.push(r);
        regMap.set(eid, list);
      }
    });

    return events.map((evt) => {
      const matched = regMap.get(evt.id) || [];
      const existing = evt.registrations || [];
      return {
        ...evt,
        registrations: existing.length > 0 ? existing : matched.map((m) => ({
          id: m.id,
          status: m.status,
          payment_status: m.payment_status,
          slot_number: m.slot_number,
        })),
      };
    });
  }, [events, registrations]);

  // Robust RFC 4180 CSV Downloader with UTF-8 BOM for 100% Excel compatibility
  const downloadCSV = (
    filename: string,
    headers: string[],
    rows: (string | number | undefined | null | boolean)[][]
  ) => {
    const escapeCSV = (val: string | number | undefined | null | boolean) => {
      if (val === undefined || val === null) return '""';
      let str = String(val);
      // Prevent formula injection in spreadsheets for text starting with =, +, -, @
      if (/^[=+\-@]/.test(str) && isNaN(Number(str))) {
        str = `'${str}`;
      }
      str = str.replace(/"/g, '""');
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
    
    // Approved Cash collections
    const approvedCash = cashRequests.filter((c) => c.status === "approved");
    const cashRevenue = approvedCash.reduce((sum, c) => sum + Number(c.total_amount || c.totalAmount || 0), 0);

    const totalUniqueDelegates =
      users.length > 0
        ? users.length
        : new Set(registrations.map((r) => r.user?.id).filter(Boolean)).size || registrations.length;

    // Accommodation requests across all sources
    const accUserIds = new Set<string>();
    users.forEach((u) => {
      if (u.needsAccommodation) accUserIds.add(u.id);
    });
    registrations.forEach((r) => {
      if ((r.needs_accommodation || r.user?.needs_accommodation) && r.user?.id) {
        accUserIds.add(r.user.id);
      }
    });
    orders.forEach((o) => {
      if (
        o.user?.id &&
        (o.user.needsAccommodation ||
          o.metadata?.needs_accommodation === true ||
          o.metadata?.needs_accommodation === "true" ||
          o.metadata?.accommodation_requested)
      ) {
        accUserIds.add(o.user.id);
      }
    });
    cashRequests.forEach((c) => {
      const uid = c.user_id || c.userId;
      if (uid && (c.needs_accommodation || c.needsAccommodation)) {
        accUserIds.add(uid);
      }
    });

    const totalStaff = coordinators.staffAssignments.length;
    const totalStudents = coordinators.studentAssignments.length;

    let accBoysCount = 0;
    let accGirlsCount = 0;
    users.forEach((u) => {
      if (u.needsAccommodation) {
        if (u.gender?.toLowerCase() === "female") accGirlsCount++;
        else accBoysCount++;
      }
    });

    return {
      totalRevenue,
      cashRevenue,
      combinedRevenue: totalRevenue + cashRevenue,
      paidOrdersCount: paidOrders.length,
      totalOrdersCount: orders.length,
      uniqueUsersCount: totalUniqueDelegates,
      totalEventsCount: eventsWithRegs.length,
      totalRegistrationsCount: registrations.length,
      accommodationCount: accUserIds.size,
      accBoysCount,
      accGirlsCount,
      totalCoordinatorsCount: totalStaff + totalStudents,
      cashRequestsCount: cashRequests.length,
      approvedCashCount: approvedCash.length,
    };
  }, [orders, registrations, eventsWithRegs, coordinators, users, cashRequests]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Financial Revenue & Payment Audit CSV
  // ─────────────────────────────────────────────────────────────────────────────
  const exportFinancialAuditCSV = () => {
    let filteredOrders = orders;
    if (orderStatusFilter === "paid") {
      filteredOrders = orders.filter((o) => o.status === "paid");
    } else if (orderStatusFilter === "unpaid") {
      filteredOrders = orders.filter((o) => o.status !== "paid");
    } else if (orderStatusFilter === "cash") {
      filteredOrders = orders.filter((o) => o.provider === "cash" || o.metadata?.cash_request_code);
    }

    const headers = [
      "S.No",
      "Order Reference Number",
      "Payment Gateway / Provider",
      "Easebuzz Transaction ID (txnid)",
      "Easebuzz Payment ID (easepayid)",
      "Bank Reference Number",
      "Payment Mode (UPI / Card / Netbanking / Cash)",
      "Delegate Full Name",
      "Gender",
      "Registered Email",
      "Mobile Phone Number",
      "Delegate Pass Code",
      "Pass Tier",
      "Student Register Number (UDF6)",
      "Audit Purpose Key (UDF7)",
      "Participant Category",
      "College / University",
      "Academic Department",
      "City / Location",
      "Gross Amount (INR)",
      "Transaction Status",
      "Gateway Error / Status Notes",
      "Registered Event 1",
      "Registered Event 2",
      "Needs Campus Accommodation",
      "Order Timestamp",
    ];

    const rows = filteredOrders.map((ord, idx) => {
      const u = ord.user;
      const meta = ord.metadata || {};
      const txnid = meta.txnid || meta.txnid_sub || ord.orderNumber || "";
      const easepayid = meta.easepayid || meta.raw_payment_response?.easepayid || "";
      const bankRef = meta.bank_ref_num || meta.raw_payment_response?.bank_ref_num || "";
      const mode = meta.mode || meta.payment_mode || (ord.provider === "cash" ? "CASH ON HAND" : ord.provider?.toUpperCase() || "ONLINE");
      const udf6 = meta.udf6 || u?.registerNumber || "";
      const udf7 = meta.udf7 || "Euphoria 2026";
      const passTier =
        ord.pass?.passTier === "pro" || ord.pass?.passTier === "pro_pass"
          ? "Euphoria 2026 Flagship Pass"
          : "Euphoria 2026 Regular Pass";
      const needsAcc =
        u?.needsAccommodation ||
        meta.needs_accommodation === true ||
        meta.needs_accommodation === "true" ||
        Boolean(meta.accommodation_requested);
      const errorMsg = meta.error_Message || meta.error || (ord.status === "failed" ? "Payment Incomplete / Cancelled" : "");

      const regEvents = u?.registeredEvents || [];
      const ev1 = regEvents.find((e) => e.slotNumber === 1)?.eventName || regEvents[0]?.eventName || "None";
      const ev2 = regEvents.find((e) => e.slotNumber === 2)?.eventName || (regEvents.length > 1 ? regEvents[1]?.eventName : "None");

      return [
        idx + 1,
        ord.orderNumber,
        ord.provider?.toUpperCase() || "EASEBUZZ",
        txnid,
        easepayid,
        bankRef,
        mode,
        u?.fullName || "Participant",
        u?.gender || "Not Specified",
        u?.email || "",
        u?.mobileNumber || "",
        ord.pass?.passCode || "N/A",
        passTier,
        udf6,
        udf7,
        u?.participantType === "internal" ? "KARE Internal Student" : "External University Delegate",
        u?.collegeName || (u?.participantType === "internal" ? "Kalasalingam Academy of Research and Education" : ""),
        u?.department || "",
        u?.city || "",
        ord.amount || 0,
        ord.status.toUpperCase(),
        errorMsg,
        ev1,
        ev2,
        needsAcc ? "YES" : "NO",
        ord.createdAt,
      ];
    });

    downloadCSV(
      `Euphoria_2026_Financial_Audit_${orderStatusFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Master Participants & Delegates Directory CSV
  // ─────────────────────────────────────────────────────────────────────────────
  const exportMasterParticipantsCSV = () => {
    let participantList: Array<{
      passCode: string;
      passStatus: string;
      passTier: string;
      fullName: string;
      gender: string;
      email: string;
      mobile: string;
      participantType: string;
      college: string;
      city: string;
      course: string;
      department: string;
      yearOfStudy: string;
      registerNumber: string;
      isProfileCompleted: boolean;
      totalClaimed: number;
      slot1Event: string;
      slot1School: string;
      slot1Venue: string;
      slot1Attendance: string;
      slot2Event: string;
      slot2School: string;
      slot2Venue: string;
      slot2Attendance: string;
      needsAcc: boolean;
      createdAt: string;
    }> = [];

    if (users && users.length > 0) {
      // Use master users list for 100% comprehensive attendee coverage
      participantList = users.map((u) => {
        const pass = u.pass;
        const reg1 = u.registrations.find((r) => r.slotNumber === 1) || u.registrations[0];
        const reg2 = u.registrations.find((r) => r.slotNumber === 2 && r.id !== reg1?.id);

        const passTier =
          pass?.passTier === "pro_pass" || pass?.passTier === ("pro" as any)
            ? "Euphoria 2026 Flagship Pass"
            : pass
            ? "Euphoria 2026 Regular Pass"
            : "No Pass Issued";

        const passStatus = pass?.status?.toUpperCase() || (u.orders.some((o) => o.status === "paid") ? "PAID" : "NONE");

        return {
          passCode: pass?.passCode || reg1?.registrationCode || "N/A",
          passStatus,
          passTier,
          fullName: u.fullName || "Participant",
          gender: u.gender || "Not Specified",
          email: u.email || "",
          mobile: u.mobileNumber || "",
          participantType: u.participantType === "internal" ? "KARE Internal" : "External University",
          college: u.collegeName || (u.participantType === "internal" ? "Kalasalingam Academy of Research and Education" : ""),
          city: u.city || "",
          course: u.course || "",
          department: u.department || "",
          yearOfStudy: u.yearOfStudy ? `${u.yearOfStudy} Year` : "",
          registerNumber: u.registerNumber || "",
          isProfileCompleted: u.isProfileCompleted,
          totalClaimed: u.registrations.length,
          slot1Event: reg1?.event?.name || "Not Selected",
          slot1School: reg1?.event?.schoolOrDept || (reg1 ? "KARE" : ""),
          slot1Venue: reg1?.event?.venue || "",
          slot1Attendance: reg1?.isAttended ? "Checked In" : reg1 ? "Pending Check-In" : "None",
          slot2Event: reg2?.event?.name || "Not Selected",
          slot2School: reg2?.event?.schoolOrDept || (reg2 ? "KARE" : ""),
          slot2Venue: reg2?.event?.venue || "",
          slot2Attendance: reg2?.isAttended ? "Checked In" : reg2 ? "Pending Check-In" : "None",
          needsAcc: Boolean(u.needsAccommodation),
          createdAt: u.createdAt,
        };
      });
    } else {
      // Fallback: Group registrations by user ID
      const userRegsMap = new Map<string, any>();
      registrations.forEach((r) => {
        const u = r.user;
        if (!u?.id) return;
        let entry = userRegsMap.get(u.id);
        if (!entry) {
          entry = { user: u, pass: r.pass, slot1: null, slot2: null, needsAcc: Boolean(r.needs_accommodation || u.needs_accommodation), createdAt: r.created_at };
          userRegsMap.set(u.id, entry);
        }
        if (r.slot_number === 2) {
          entry.slot2 = r;
        } else {
          entry.slot1 = r;
        }
      });

      participantList = Array.from(userRegsMap.values()).map((entry) => {
        const u = entry.user;
        const pass = entry.pass;
        const s1 = entry.slot1;
        const s2 = entry.slot2;

        return {
          passCode: pass?.pass_code || s1?.registration_code || "N/A",
          passStatus: pass?.status?.toUpperCase() || "ACTIVE",
          passTier: pass?.pass_tier === "pro" ? "Euphoria 2026 Flagship Pass" : "Euphoria 2026 Regular Pass",
          fullName: u.full_name || "Delegate",
          gender: u.gender || "Not Specified",
          email: u.email || "",
          mobile: u.mobile_number || "",
          participantType: u.participant_type === "internal" ? "KARE Internal" : "External University",
          college: u.college_name || (u.participant_type === "internal" ? "Kalasalingam Academy of Research and Education" : ""),
          city: u.city || "",
          course: u.course || "",
          department: u.department || "",
          yearOfStudy: u.year_of_study ? `${u.year_of_study} Year` : "",
          registerNumber: u.register_number || "",
          isProfileCompleted: Boolean(u.is_profile_completed),
          totalClaimed: (s1 ? 1 : 0) + (s2 ? 1 : 0),
          slot1Event: s1?.event?.name || "Not Selected",
          slot1School: s1?.event?.school_or_dept || "KARE",
          slot1Venue: s1?.event?.venue || "",
          slot1Attendance: (s1?.attendance || []).length > 0 ? "Checked In" : s1 ? "Pending" : "None",
          slot2Event: s2?.event?.name || "Not Selected",
          slot2School: s2?.event?.school_or_dept || "KARE",
          slot2Venue: s2?.event?.venue || "",
          slot2Attendance: (s2?.attendance || []).length > 0 ? "Checked In" : s2 ? "Pending" : "None",
          needsAcc: entry.needsAcc,
          createdAt: entry.createdAt,
        };
      });
    }

    // Apply Filter
    if (participantFilter === "internal") {
      participantList = participantList.filter((p) => p.participantType.includes("Internal"));
    } else if (participantFilter === "external") {
      participantList = participantList.filter((p) => !p.participantType.includes("Internal"));
    } else if (participantFilter === "has_pass") {
      participantList = participantList.filter((p) => p.passCode && p.passCode !== "N/A");
    } else if (participantFilter === "registered_events") {
      participantList = participantList.filter((p) => p.totalClaimed > 0);
    }

    const headers = [
      "S.No",
      "Delegate Pass Code",
      "Pass Status",
      "Pass Tier",
      "Full Name",
      "Gender",
      "Email Address",
      "Mobile Phone Number",
      "Participant Category",
      "College / University Name",
      "City / Location",
      "Degree / Course",
      "Academic Department",
      "Year of Study",
      "Student Register / Roll Number",
      "Profile Completed",
      "Total Competitions Claimed",
      "Slot 1 Chosen Event",
      "Slot 1 Organizing School",
      "Slot 1 Venue Location",
      "Slot 1 Attendance Status",
      "Slot 2 Chosen Event",
      "Slot 2 Organizing School",
      "Slot 2 Venue Location",
      "Slot 2 Attendance Status",
      "Needs Campus Accommodation",
      "Account Registration Date",
    ];

    const rows = participantList.map((p, idx) => [
      idx + 1,
      p.passCode,
      p.passStatus,
      p.passTier,
      p.fullName,
      p.gender,
      p.email,
      p.mobile,
      p.participantType,
      p.college,
      p.city,
      p.course,
      p.department,
      p.yearOfStudy,
      p.registerNumber,
      p.isProfileCompleted ? "YES" : "NO",
      p.totalClaimed,
      p.slot1Event,
      p.slot1School,
      p.slot1Venue,
      p.slot1Attendance,
      p.slot2Event,
      p.slot2School,
      p.slot2Venue,
      p.slot2Attendance,
      p.needsAcc ? "YES" : "NO",
      p.createdAt,
    ]);

    downloadCSV(
      `Euphoria_2026_Master_Participants_${participantFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Event-Wise Rosters & Physical Attendance Sheet CSV
  // ─────────────────────────────────────────────────────────────────────────────
  const exportEventAttendanceCSV = () => {
    let targetRegs = registrations;
    let eventNameLabel = "All_Competitions_Combined";

    if (selectedEventId !== "all") {
      targetRegs = targetRegs.filter((r) => r.event?.id === selectedEventId);
      const chosen = eventsWithRegs.find((e) => e.id === selectedEventId);
      if (chosen) {
        eventNameLabel = chosen.name.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 30);
      }
    }

    const headers = [
      "S.No",
      "Event Name",
      "Organizing School / Department",
      "Venue Location",
      "Event Date",
      "Event Timing",
      "Delegate Pass Code",
      "Event Registration Code",
      "Slot Choice",
      "Participant Full Name",
      "Gender",
      "Student Register / Roll Number",
      "Participant Category (Internal / External)",
      "College / University",
      "Academic Department",
      "Degree / Course & Year",
      "Mobile Contact Number",
      "Email Address",
      "Registration Status",
      "Payment Status",
      "Attendance Status",
      "Check-In Timestamp",
      "Check-In Scan Method",
      "Physical Signature / Invigilator Remarks",
    ];

    const rows = targetRegs.map((r, idx) => {
      const u = r.user;
      const e = r.event;
      const att = (r.attendance || [])[0];
      const timeRange = e?.start_time ? `${e.start_time}${e.end_time ? ` - ${e.end_time}` : ""}` : "Scheduled";

      return [
        idx + 1,
        e?.name || "Competition",
        e?.school_or_dept || "KARE",
        e?.venue || "Campus Venue",
        e?.event_date || "25-26 Sept 2026",
        timeRange,
        r.pass?.pass_code || "N/A",
        r.registration_code || "",
        `Slot ${r.slot_number || 1}${r.slot_number === 1 ? " (First Choice)" : " (Second Choice)"}`,
        u?.full_name || "Participant",
        u?.gender || "Not Specified",
        u?.register_number || "",
        u?.participant_type === "internal" ? "KARE Internal" : "External University",
        u?.college_name || (u?.participant_type === "internal" ? "KARE" : "External College"),
        u?.department || "",
        u?.course ? `${u.course} ${u.year_of_study ? `(${u.year_of_study}Y)` : ""}` : "",
        u?.mobile_number || "",
        u?.email || "",
        r.status?.toUpperCase() || "CONFIRMED",
        r.payment_status?.toUpperCase() || "PAID",
        att ? "CHECKED IN" : "PENDING CHECK-IN",
        att?.scanned_at ? new Date(att.scanned_at).toLocaleString() : "",
        att?.scan_method || "",
        "", // Blank for clipboard signature
      ];
    });

    downloadCSV(
      `Euphoria_2026_Attendance_Sheet_${eventNameLabel}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Campus Accommodation & Hospitality Checklist CSV
  // ─────────────────────────────────────────────────────────────────────────────
  const exportAccommodationCSV = () => {
    const accList: Array<{
      passCode: string;
      passTier: string;
      passStatus: string;
      name: string;
      gender: string;
      email: string;
      mobile: string;
      college: string;
      city: string;
      department: string;
      participantType: string;
      event1: string;
      event2: string;
      totalEvents: number;
    }> = [];

    const processedUserIds = new Set<string>();

    // Priority 1: Check users master list
    (users || []).forEach((u) => {
      if (u.needsAccommodation) {
        processedUserIds.add(u.id);
        const pass = u.pass;
        const reg1 = u.registrations[0];
        const reg2 = u.registrations[1];

        accList.push({
          passCode: pass?.passCode || reg1?.registrationCode || "N/A",
          passTier: pass?.passTier === "pro_pass" ? "Flagship Pass" : "Regular Pass",
          passStatus: pass?.status?.toUpperCase() || "PENDING",
          name: u.fullName,
          gender: u.gender ? u.gender.toUpperCase() : "NOT SPECIFIED",
          email: u.email,
          mobile: u.mobileNumber || "",
          college: u.collegeName || (u.participantType === "internal" ? "KARE" : "External Institution"),
          city: u.city || "",
          department: u.department || "",
          participantType: u.participantType === "internal" ? "KARE Internal" : "External University",
          event1: reg1?.event?.name || "Not Selected",
          event2: reg2?.event?.name || "None",
          totalEvents: u.registrations.length,
        });
      }
    });

    // Priority 2: Check registrations for any user not captured above
    registrations.forEach((r) => {
      const u = r.user;
      if (!u?.id || processedUserIds.has(u.id)) return;
      if (r.needs_accommodation || u.needs_accommodation) {
        processedUserIds.add(u.id);
        const userRegs = registrations.filter((reg) => reg.user?.id === u.id);
        const s1 = userRegs.find((reg) => reg.slot_number === 1) || userRegs[0];
        const s2 = userRegs.find((reg) => reg.slot_number === 2 && reg.id !== s1?.id);

        accList.push({
          passCode: r.pass?.pass_code || r.registration_code,
          passTier: r.pass?.pass_tier === "pro" ? "Flagship Pass" : "Regular Pass",
          passStatus: r.pass?.status?.toUpperCase() || "ACTIVE",
          name: u.full_name || "Delegate",
          gender: u.gender ? u.gender.toUpperCase() : "NOT SPECIFIED",
          email: u.email || "",
          mobile: u.mobile_number || "",
          college: u.college_name || (u.participant_type === "internal" ? "KARE" : "External College"),
          city: u.city || "",
          department: u.department || "",
          participantType: u.participant_type === "internal" ? "Internal" : "External University",
          event1: s1?.event?.name || "General Track",
          event2: s2?.event?.name || "None",
          totalEvents: userRegs.length,
        });
      }
    });

    // Filter
    let filteredList = accList;
    if (accommodationFilter === "external") {
      filteredList = filteredList.filter((a) => a.participantType.includes("External"));
    } else if (accommodationFilter === "internal") {
      filteredList = filteredList.filter((a) => a.participantType.includes("Internal"));
    } else if (accommodationFilter === "male") {
      filteredList = filteredList.filter((a) => a.gender === "MALE");
    } else if (accommodationFilter === "female") {
      filteredList = filteredList.filter((a) => a.gender === "FEMALE");
    }

    const headers = [
      "S.No",
      "Delegate Pass Code",
      "Pass Tier",
      "Payment Status",
      "Delegate Full Name",
      "Gender (CRITICAL: BOYS / GIRLS HOSTEL ALLOTMENT)",
      "Mobile Contact Number",
      "Registered Email",
      "Participant Category",
      "Home Institution / College",
      "City / Native State",
      "Department",
      "Registered Event 1",
      "Registered Event 2",
      "Total Competitions",
      "Festival Arrival Window",
      "Tariff Status",
      "Allotted Hostel Block & Room Number",
      "Warden / Desk In-Charge Signature",
    ];

    const rows = filteredList.map((item, idx) => [
      idx + 1,
      item.passCode,
      item.passTier,
      item.passStatus,
      item.name,
      item.gender,
      item.mobile,
      item.email,
      item.participantType,
      item.college,
      item.city,
      item.department,
      item.event1,
      item.event2,
      item.totalEvents,
      "24 Sept Evening / 25 Sept Morning",
      "INR 250/night payable at Desk",
      "", // Blank for hostel block
      "", // Blank for warden signature
    ]);

    downloadCSV(
      `Euphoria_2026_Accommodation_Checklist_${accommodationFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Coordinators Roster CSV (Faculty & Student)
  // ─────────────────────────────────────────────────────────────────────────────
  const exportCoordinatorsCSV = () => {
    const list: Array<{
      role: string;
      name: string;
      email: string;
      mobile: string;
      registerNo?: string;
      event: string;
      school: string;
      venue: string;
      timing: string;
      source: string;
      createdAt: string;
    }> = [];

    // Add Staff Assignments
    if (coordinatorRoleFilter === "all" || coordinatorRoleFilter === "staff") {
      coordinators.staffAssignments.forEach((s) => {
        const u = s.user;
        const e = s.event;
        const timing = e?.start_time ? `${e.start_time}${e.end_time ? ` - ${e.end_time}` : ""}` : "Festival Hours";
        list.push({
          role: "Faculty / Staff Coordinator",
          name: u?.full_name || "Faculty In-Charge",
          email: u?.email || "",
          mobile: u?.mobile_number || "",
          registerNo: "",
          event: e?.name || "General Track",
          school: e?.school_or_dept || u?.department || "KARE",
          venue: e?.venue || "Campus Venue",
          timing,
          source: s.id.startsWith("sheet_") ? "Department Roster Import" : "Platform Role Assignment",
          createdAt: s.created_at || "",
        });
      });
    }

    // Add Student Assignments
    if (coordinatorRoleFilter === "all" || coordinatorRoleFilter === "student") {
      coordinators.studentAssignments.forEach((st) => {
        const u = st.user;
        const e = st.event;
        const timing = e?.start_time ? `${e.start_time}${e.end_time ? ` - ${e.end_time}` : ""}` : "Festival Hours";
        list.push({
          role: "Student Coordinator",
          name: u?.full_name || "Student In-Charge",
          email: u?.email || "",
          mobile: u?.mobile_number || "",
          registerNo: u?.register_number || "",
          event: e?.name || "General Track",
          school: e?.school_or_dept || u?.department || "KARE",
          venue: e?.venue || "Campus Venue",
          timing,
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
      "Competition Venue",
      "Event Schedule / Timing",
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
      item.venue,
      item.timing,
      item.source,
      item.createdAt,
    ]);

    downloadCSV(
      `Euphoria_2026_Coordinators_Roster_${coordinatorRoleFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Master Competitions & Events Catalog CSV (All 61 Events)
  // ─────────────────────────────────────────────────────────────────────────────
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
      "Slot 2 Second-Choice Count",
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

    const rows = eventsWithRegs.map((evt, idx) => {
      const sched = getEventSchedule(evt);
      const regCount = (evt.registrations || []).length;
      const firstSlotCount = (evt.registrations || []).filter((r) => r.slot_number === 1).length;
      const secondSlotCount = (evt.registrations || []).filter((r) => r.slot_number === 2).length;
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
        secondSlotCount,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Cash Desk Registration Requests & Collections CSV
  // ─────────────────────────────────────────────────────────────────────────────
  const exportCashDeskCSV = () => {
    let filteredCash = cashRequests;
    if (cashStatusFilter !== "all") {
      filteredCash = cashRequests.filter((c) => c.status === cashStatusFilter);
    }

    const headers = [
      "S.No",
      "Cash Request Code",
      "Student Full Name",
      "Registered Email",
      "Mobile Contact Number",
      "College / Institution",
      "Student Register Number",
      "Department",
      "Participant Category",
      "Pass Tier",
      "Cash Amount (INR)",
      "Campus Accommodation Requested",
      "Request Status",
      "Issued Pass Code",
      "Issued Order ID",
      "Approver ID",
      "Approval Timestamp",
      "Submission Timestamp",
      "Admin Desk Notes",
      "Rejection Reason",
    ];

    const rows = filteredCash.map((item, idx) => {
      const code = item.request_code || item.requestCode || "";
      const name = item.full_name || item.fullName || "Participant";
      const phone = item.phone || "";
      const college = item.college_name || item.collegeName || "";
      const regNo = item.register_number || item.registerNumber || "";
      const dept = item.department || "";
      const pType = item.participant_type || item.participantType || "external";
      const tier = item.pass_tier || item.passTier || "standard_pass";
      const amount = item.total_amount || item.totalAmount || 200;
      const needsAcc = item.needs_accommodation || item.needsAccommodation;
      const passCode = item.issued_pass_code || "N/A";
      const orderId = item.issued_order_id || "N/A";
      const approver = item.approved_by || "System/Admin";
      const approvedAt = item.approved_at || "";
      const createdAt = item.created_at || item.createdAt || "";

      return [
        idx + 1,
        code,
        name,
        item.email || "",
        phone,
        college,
        regNo,
        dept,
        pType === "internal" ? "KARE Internal" : "External University",
        tier === "pro_pass" ? "Flagship Pass" : "Regular Pass",
        amount,
        needsAcc ? "YES" : "NO",
        item.status.toUpperCase(),
        passCode,
        orderId,
        approver,
        approvedAt,
        createdAt,
        item.admin_notes || "",
        item.rejection_reason || "",
      ];
    });

    downloadCSV(
      `Euphoria_2026_Cash_Desk_Collections_${cashStatusFilter}_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Complete Master All-Data Consolidated Dump CSV
  // ─────────────────────────────────────────────────────────────────────────────
  const exportMasterAllDataDumpCSV = () => {
    // Merge users, passes, orders, and registrations into one comprehensive spreadsheet
    const headers = [
      "S.No",
      "User ID",
      "Full Name",
      "Email Address",
      "Mobile Phone Number",
      "Gender",
      "Participant Category",
      "College / Institution",
      "Department",
      "Degree / Course",
      "Year of Study",
      "Student Register Number",
      "City / Location",
      "Needs Accommodation",
      "Delegate Pass Code",
      "Pass Tier",
      "Pass Payment Status",
      "Total Amount Paid (INR)",
      "Slots Claimed",
      "Slot 1 Event Name",
      "Slot 1 Department",
      "Slot 1 Venue",
      "Slot 1 Check-In Status",
      "Slot 2 Event Name",
      "Slot 2 Department",
      "Slot 2 Venue",
      "Slot 2 Check-In Status",
      "Latest Order Reference",
      "Payment Gateway",
      "Registered On",
    ];

    const sourceUsers =
      users.length > 0
        ? users
        : (registrations.map((r) => ({
            id: r.user?.id || r.id,
            fullName: r.user?.full_name || "Delegate",
            email: r.user?.email || "",
            mobileNumber: r.user?.mobile_number || "",
            gender: r.user?.gender || "",
            participantType: r.user?.participant_type || "external",
            collegeName: r.user?.college_name || "",
            department: r.user?.department || "",
            course: r.user?.course || "",
            yearOfStudy: r.user?.year_of_study || undefined,
            registerNumber: r.user?.register_number || "",
            city: r.user?.city || "",
            needsAccommodation: Boolean(r.needs_accommodation || r.user?.needs_accommodation),
            pass: r.pass ? { passCode: r.pass.pass_code, passTier: r.pass.pass_tier, amountPaid: r.pass.amount_paid, status: r.pass.status } : null,
            registrations: [
              {
                slotNumber: r.slot_number || 1,
                event: { name: r.event?.name || "", schoolOrDept: r.event?.school_or_dept || "", venue: r.event?.venue || "" },
                isAttended: (r.attendance || []).length > 0,
              },
            ],
            orders: [],
            createdAt: r.created_at,
          })) as any[]);

    const rows = sourceUsers.map((u, idx) => {
      const pass = u.pass;
      const reg1 = u.registrations.find((r: any) => r.slotNumber === 1) || u.registrations[0];
      const reg2 = u.registrations.find((r: any) => r.slotNumber === 2 && r.id !== reg1?.id);
      const latestOrder = u.orders && u.orders[0];

      return [
        idx + 1,
        u.id,
        u.fullName,
        u.email,
        u.mobileNumber || "",
        u.gender || "Not Specified",
        u.participantType === "internal" ? "KARE Internal" : "External University",
        u.collegeName || (u.participantType === "internal" ? "KARE" : ""),
        u.department || "",
        u.course || "",
        u.yearOfStudy ? `${u.yearOfStudy} Year` : "",
        u.registerNumber || "",
        u.city || "",
        u.needsAccommodation ? "YES" : "NO",
        pass?.passCode || "N/A",
        pass?.passTier === "pro_pass" ? "Flagship Pass" : pass ? "Regular Pass" : "No Pass",
        pass?.status?.toUpperCase() || (latestOrder?.status === "paid" ? "PAID" : "PENDING"),
        pass?.amountPaid || latestOrder?.amount || 0,
        u.registrations.length,
        reg1?.event?.name || "None",
        reg1?.event?.schoolOrDept || "",
        reg1?.event?.venue || "",
        reg1?.isAttended ? "Checked In" : reg1 ? "Pending" : "None",
        reg2?.event?.name || "None",
        reg2?.event?.schoolOrDept || "",
        reg2?.event?.venue || "",
        reg2?.isAttended ? "Checked In" : reg2 ? "Pending" : "None",
        latestOrder?.orderNumber || "N/A",
        latestOrder?.provider?.toUpperCase() || "EASEBUZZ",
        u.createdAt,
      ];
    });

    downloadCSV(
      `Euphoria_2026_Consolidated_Master_Data_Dump_${todayStr}.csv`,
      headers,
      rows
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Batch Sequential Download of All Spreadsheets
  // ─────────────────────────────────────────────────────────────────────────────
  const downloadAllReportsBundle = async () => {
    setIsDownloadingAll(true);
    setDownloadStatus("Starting batch export...");
    try {
      setDownloadStatus("Downloading Financial Revenue & Audit CSV...");
      exportFinancialAuditCSV();
      await new Promise((r) => setTimeout(r, 650));

      setDownloadStatus("Downloading Coordinators Directory CSV...");
      exportCoordinatorsCSV();
      await new Promise((r) => setTimeout(r, 650));

      setDownloadStatus("Downloading Master Participants Directory CSV...");
      exportMasterParticipantsCSV();
      await new Promise((r) => setTimeout(r, 650));

      setDownloadStatus("Downloading Campus Accommodation Checklist CSV...");
      exportAccommodationCSV();
      await new Promise((r) => setTimeout(r, 650));

      setDownloadStatus("Downloading Master Events Catalog CSV...");
      exportMasterEventsCSV();
      await new Promise((r) => setTimeout(r, 650));

      if (cashRequests.length > 0) {
        setDownloadStatus("Downloading Cash Desk Collections CSV...");
        exportCashDeskCSV();
        await new Promise((r) => setTimeout(r, 650));
      }

      setDownloadStatus("Downloading Consolidated Master Data Dump CSV...");
      exportMasterAllDataDumpCSV();
      await new Promise((r) => setTimeout(r, 650));

      setDownloadStatus("All spreadsheets downloaded successfully!");
      setTimeout(() => setDownloadStatus(null), 3500);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Revenue */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Revenue
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {formatCurrency(metrics.combinedRevenue)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {metrics.paidOrdersCount} Paid + {metrics.approvedCashCount} Cash
          </span>
        </div>

        {/* Registered Delegates */}
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

        {/* Competitions */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Competitions
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {metrics.totalEventsCount}
          </p>
          <span className="text-[10px] text-indigo-600 font-semibold">
            {metrics.totalRegistrationsCount} Total Slots
          </span>
        </div>

        {/* Coordinators */}
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

        {/* Hostel Requests */}
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

        {/* Batch Exporter */}
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Batch Download
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">
              All 8 Core Spreadsheets
            </p>
          </div>
          <button
            onClick={downloadAllReportsBundle}
            disabled={isDownloadingAll}
            className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 px-2.5 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span>{isDownloadingAll ? "Exporting..." : "Export All (.csv)"}</span>
          </button>
        </div>
      </div>

      {/* Download Status Toast/Banner if active */}
      {downloadStatus && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{downloadStatus}</span>
          </div>
        </div>
      )}

      {/* Main Reports Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                Order IDs, Easebuzz transaction IDs (txnid), payment IDs (easepayid), bank references, payment channels, UDF6 student ID, UDF7 key, pass tiers, and amounts.
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
                <option value="cash">Cash Counter Transactions Only</option>
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

        {/* Card 2: Master Participants & Delegates Directory */}
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
                Comprehensive directory of all registered delegates: pass codes, pass tiers, Slot 1 &amp; Slot 2 event selections, institutions, cities, contact numbers, and year of study.
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
                <option value="all">All Registered Attendees ({metrics.uniqueUsersCount})</option>
                <option value="external">External University Delegates</option>
                <option value="internal">KARE Internal Students</option>
                <option value="has_pass">Pass Holders Only</option>
                <option value="registered_events">Selected Event Slots Only</option>
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

        {/* Card 3: Event-Wise Attendance & Signature Sheet */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Printer className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100">
                Desk Verification
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Event Rosters &amp; Attendance Sheets
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Printable competition rosters with student roll numbers, departments, check-in scan timestamps, and physical signature blank columns for hall invigilators.
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
                {eventsWithRegs.map((evt) => {
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

        {/* Card 4: Campus Accommodation Desk Checklist */}
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
                Roster of delegates requesting hostel stay, including Gender for Boys vs Girls hostel block allotment, arrival dates, contact details, and desk tariff collection notes.
              </p>
            </div>

            {/* Breakdown Badges */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 border border-blue-200">
                Boys Hostel: {metrics.accBoysCount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-700 border border-pink-200">
                Girls Hostel: {metrics.accGirlsCount}
              </span>
            </div>

            {/* Filter */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Filter Stay Requests:
              </label>
              <select
                value={accommodationFilter}
                onChange={(e) => setAccommodationFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">All Stay Requests ({metrics.accommodationCount})</option>
                <option value="external">External University Delegates Only</option>
                <option value="internal">Internal Students Only</option>
                <option value="male">Male - Boys Hostel Block ({metrics.accBoysCount})</option>
                <option value="female">Female - Girls Hostel Block ({metrics.accGirlsCount})</option>
              </select>
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

        {/* Card 5: Faculty & Student Coordinators Directory */}
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
                Contact roster of all faculty organizers and student leads across departments, event venues, timings, mobile numbers, and emails.
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
                Exhaustive catalog export of all 61 competitions with live confirmed registration counts, slot 1 &amp; slot 2 counts, remaining seats, fill percentages, and venues.
              </p>
            </div>

            <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-2.5 text-[11px] text-rose-800 space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Total Cataloged Events:</span>
                <span>{eventsWithRegs.length} Events</span>
              </div>
              <p className="text-[10px] text-rose-700">
                Live seat counts and 12 multi-day schedule mappings included.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportMasterEventsCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Events Master CSV ({eventsWithRegs.length})</span>
            </button>
          </div>
        </div>

        {/* Card 7: Cash Desk Registration Requests & Physical Counter Collections */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Banknote className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-100">
                Cash Registration Counter
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cash Desk &amp; In-Person Collections
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Audit spreadsheet of cash registration receipts, physical counter payments, approved festival passes, and cash collected at the helpdesk.
              </p>
            </div>

            {/* Filter */}
            <div className="pt-1">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                Cash Status Filter:
              </label>
              <select
                value={cashStatusFilter}
                onChange={(e) => setCashStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-none"
              >
                <option value="all">All Cash Requests ({metrics.cashRequestsCount})</option>
                <option value="approved">Approved &amp; Collected ({metrics.approvedCashCount})</option>
                <option value="pending">Pending Cash Verification</option>
                <option value="rejected">Rejected / Cancelled Requests</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportCashDeskCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Cash Collections CSV</span>
            </button>
          </div>
        </div>

        {/* Card 8: Consolidated Master All-Data Dump */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-violet-300 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <FileCheck className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-100">
                Full Database Dump
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Master Consolidated Data Dump
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Single unified master spreadsheet combining participant profiles, delegate pass codes, order payments, Slot 1 and Slot 2 events, check-ins, and hostel stays.
              </p>
            </div>

            <div className="rounded-xl bg-violet-50/70 border border-violet-200 p-2.5 text-[11px] text-violet-800 space-y-1">
              <div className="flex justify-between font-semibold">
                <span>All-In-One Unified Export</span>
                <span>{metrics.uniqueUsersCount} Rows</span>
              </div>
              <p className="text-[10px] text-violet-700">
                Complete multi-table joined view for senior administrators.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={exportMasterAllDataDumpCSV}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-violet-700 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Consolidated Master CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
