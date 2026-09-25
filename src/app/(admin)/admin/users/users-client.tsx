"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  AdminUserListItem,
  AdminUsersMetrics,
  getAdminUsersPaginatedAction,
  getUserOrdersAdmin,
  refreshAdminUsersCacheAction,
  exportAdminUsersCsvAction,
  updateUserProfileAdmin,
  updateUserRoleAdmin,
  getAdminEventsListSimpleAction,
  adminChangeEventForUserAction,
  adminAssignEventForUserAction,
  adminRemoveRegistrationAction,
  AdminEventSimpleItem,
  CallerAuthInfo,
} from "@/actions/admin";
import {
  Search,
  Users,
  ShieldCheck,
  Star,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Check,
  Building,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Layers,
  UserCheck,
  UserX,
  Edit3,
  Lock,
  Crown,
  Shield,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Zap,
  ArrowLeftRight,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";

export function UsersAdminClient({
  initialUsers,
  initialTotalCount,
  initialMetrics,
  currentUserRole,
}: {
  initialUsers: AdminUserListItem[];
  initialTotalCount: number;
  initialMetrics: AdminUsersMetrics;
  currentUserRole?: CallerAuthInfo | null;
}) {
  const [users, setUsers] = useState<AdminUserListItem[]>(initialUsers);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [metrics, setMetrics] = useState<AdminUsersMetrics>(initialMetrics);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // Display limit: 25, 50, 100
  const [jumpPage, setJumpPage] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [passFilter, setPassFilter] = useState<"all" | "pro_pass" | "standard_pass" | "no_pass">("all");
  const [slotFilter, setSlotFilter] = useState<"all" | "0" | "1" | "2">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "internal" | "external">("all");
  const [profileFilter, setProfileFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "super_admin" | "admin" | "overall_coordinator" | "staff_coordinator" | "student_coordinator" | "participant">("all");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<"events" | "profile" | "roles" | "orders">("events");
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    mobileNumber: "",
    registerNumber: "",
    collegeName: "",
    department: "",
    course: "",
    yearOfStudy: 1,
    participantType: "external" as "internal" | "external",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Event Change & Slot Allocation State
  const [availableEvents, setAvailableEvents] = useState<AdminEventSimpleItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [activeEventAction, setActiveEventAction] = useState<{
    mode: "change" | "assign";
    registrationId?: string;
    slotNumber?: number;
    currentEventId?: string;
    currentEventName?: string;
    isAttended?: boolean;
  } | null>(null);
  const [selectedNewEventId, setSelectedNewEventId] = useState<string>("");
  const [overrideCapacity, setOverrideCapacity] = useState<boolean>(false);
  const [resetAttendance, setResetAttendance] = useState<boolean>(true);
  const [changeReason, setChangeReason] = useState<string>("");
  const [eventSearchTerm, setEventSearchTerm] = useState<string>("");
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>("all");
  const [isSubmittingEventAction, setIsSubmittingEventAction] = useState<boolean>(false);

  const isInitialMount = useRef(true);

  // Core Data Fetcher
  const loadData = useCallback(
    async (
      targetPage: number,
      limit: number,
      search: string,
      pass: typeof passFilter,
      slot: typeof slotFilter,
      type: typeof typeFilter,
      prof: typeof profileFilter,
      role: typeof roleFilter
    ) => {
      setIsLoading(true);
      try {
        const res = await getAdminUsersPaginatedAction({
          page: targetPage,
          limit,
          search,
          passFilter: pass,
          slotFilter: slot,
          typeFilter: type,
          profileFilter: prof,
          roleFilter: role,
        });

        if (res.success) {
          setUsers(res.users);
          setTotalCount(res.totalCount);
          setPage(res.page);
          if (res.metrics) setMetrics(res.metrics);
        }
      } catch (err) {
        console.error("Error fetching admin users page:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounced search & filter trigger
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      loadData(1, pageSize, searchQuery, passFilter, slotFilter, typeFilter, profileFilter, roleFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, passFilter, slotFilter, typeFilter, profileFilter, roleFilter, pageSize, loadData]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const fromRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, totalCount);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || isLoading) return;
    loadData(newPage, pageSize, searchQuery, passFilter, slotFilter, typeFilter, profileFilter, roleFilter);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPage, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      handlePageChange(target);
      setJumpPage("");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAdminUsersCacheAction();
      await loadData(page, pageSize, searchQuery, passFilter, slotFilter, typeFilter, profileFilter, roleFilter);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenUserModal = async (user: AdminUserListItem) => {
    setSelectedUser(user);
    setModalActiveTab("events");
    setIsEditMode(false);
    setActiveEventAction(null);
    setSelectedNewEventId("");
    setEditFormData({
      fullName: user.fullName,
      mobileNumber: user.mobileNumber || "",
      registerNumber: user.registerNumber || "",
      collegeName: user.collegeName || "",
      department: user.department || "",
      course: user.course || "",
      yearOfStudy: user.yearOfStudy || 1,
      participantType: user.participantType,
    });
    setActionSuccess(null);
    setActionError(null);

    // Fetch user's orders on-demand (0 bulk egress)
    setLoadingOrders(true);
    setUserOrders([]);
    try {
      const res = await getUserOrdersAdmin(user.id);
      if (res.success) {
        setUserOrders(res.orders || []);
      }
    } catch {
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await updateUserProfileAdmin(selectedUser.id, {
      fullName: editFormData.fullName,
      mobileNumber: editFormData.mobileNumber,
      registerNumber: editFormData.registerNumber,
      collegeName: editFormData.collegeName,
      department: editFormData.department,
      course: editFormData.course,
      yearOfStudy: Number(editFormData.yearOfStudy),
      participantType: editFormData.participantType,
    });

    if (!res.success) {
      setActionError(res.error || "Failed to update profile");
    } else {
      setActionSuccess("Profile updated successfully!");
      setIsEditMode(false);

      // Update state locally
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                fullName: editFormData.fullName,
                mobileNumber: editFormData.mobileNumber,
                registerNumber: editFormData.registerNumber,
                collegeName: editFormData.collegeName,
                department: editFormData.department,
                course: editFormData.course,
                yearOfStudy: Number(editFormData.yearOfStudy),
                participantType: editFormData.participantType,
              }
            : u
        )
      );

      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              fullName: editFormData.fullName,
              mobileNumber: editFormData.mobileNumber,
              registerNumber: editFormData.registerNumber,
              collegeName: editFormData.collegeName,
              department: editFormData.department,
              course: editFormData.course,
              yearOfStudy: Number(editFormData.yearOfStudy),
              participantType: editFormData.participantType,
            }
          : null
      );
    }
    setIsSubmitting(false);
  };

  const handleToggleRole = async (
    roleId: "admin" | "overall_coordinator" | "staff_coordinator" | "student_coordinator",
    action: "assign" | "revoke"
  ) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    const res = await updateUserRoleAdmin(selectedUser.id, roleId, action);

    if (res.success) {
      const updatedRoles =
        action === "assign"
          ? Array.from(new Set([...selectedUser.roles, roleId]))
          : selectedUser.roles.filter((r) => r !== roleId);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, roles: updatedRoles } : u
        )
      );

      setSelectedUser((prev) => (prev ? { ...prev, roles: updatedRoles } : null));
      setActionSuccess(`Role ${action === "assign" ? "assigned" : "revoked"} successfully!`);
    } else {
      setActionError(res.error || "Failed to update role");
    }
    setIsSubmitting(false);
  };

  // Event Change / Swap Handlers
  const loadAvailableEvents = async () => {
    if (availableEvents.length > 0) return;
    setLoadingEvents(true);
    try {
      const res = await getAdminEventsListSimpleAction();
      if (res.success) {
        setAvailableEvents(res.events);
      }
    } catch (err) {
      console.error("Failed to load events for admin swap:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleStartChangeEvent = (reg: AdminUserListItem["registrations"][number]) => {
    setActiveEventAction({
      mode: "change",
      registrationId: reg.id,
      slotNumber: reg.slotNumber,
      currentEventId: reg.event.id,
      currentEventName: reg.event.name,
      isAttended: reg.isAttended,
    });
    setSelectedNewEventId("");
    setOverrideCapacity(false);
    setResetAttendance(true);
    setChangeReason("");
    setEventSearchTerm("");
    setEventCategoryFilter("all");
    setActionSuccess(null);
    setActionError(null);
    loadAvailableEvents();
  };

  const handleStartAssignEvent = () => {
    const existingSlots = new Set((selectedUser?.registrations || []).map((r) => r.slotNumber));
    const nextSlot = !existingSlots.has(1) ? 1 : 2;
    setActiveEventAction({
      mode: "assign",
      slotNumber: nextSlot,
    });
    setSelectedNewEventId("");
    setOverrideCapacity(false);
    setChangeReason("");
    setEventSearchTerm("");
    setEventCategoryFilter("all");
    setActionSuccess(null);
    setActionError(null);
    loadAvailableEvents();
  };

  const handleConfirmChangeEvent = async () => {
    if (!selectedUser || !activeEventAction || !selectedNewEventId) return;

    setIsSubmittingEventAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (activeEventAction.mode === "change" && activeEventAction.registrationId) {
        const res = await adminChangeEventForUserAction({
          registrationId: activeEventAction.registrationId,
          userId: selectedUser.id,
          newEventId: selectedNewEventId,
          overrideCapacity,
          resetAttendance,
          reason: changeReason || "Admin User Inspector Swap",
        });

        if (!res.success || !res.updatedRegistration) {
          setActionError(res.error || "Failed to change event");
          setIsSubmittingEventAction(false);
          return;
        }

        const updatedReg = res.updatedRegistration;

        // Update selectedUser locally
        setSelectedUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            registrations: prev.registrations.map((r) =>
              r.id === updatedReg.id ? updatedReg : r
            ),
          };
        });

        // Update users list table locally
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== selectedUser.id) return u;
            return {
              ...u,
              registrations: u.registrations.map((r) =>
                r.id === updatedReg.id ? updatedReg : r
              ),
            };
          })
        );

        setActionSuccess(res.message || "Event changed successfully!");
        setActiveEventAction(null);
      } else if (activeEventAction.mode === "assign") {
        const res = await adminAssignEventForUserAction({
          userId: selectedUser.id,
          newEventId: selectedNewEventId,
          overrideCapacity,
        });

        if (!res.success || !res.newRegistration) {
          setActionError(res.error || "Failed to assign event");
          setIsSubmittingEventAction(false);
          return;
        }

        const newReg = res.newRegistration;

        // Update selectedUser locally
        setSelectedUser((prev) => {
          if (!prev) return null;
          const updatedRegs = [...prev.registrations, newReg].sort(
            (a, b) => a.slotNumber - b.slotNumber
          );
          const updatedPass = prev.pass
            ? { ...prev.pass, slotsUsed: Math.min(2, prev.pass.slotsUsed + 1) }
            : prev.pass;
          return {
            ...prev,
            registrations: updatedRegs,
            pass: updatedPass,
          };
        });

        // Update users list table locally
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== selectedUser.id) return u;
            const updatedRegs = [...u.registrations, newReg].sort(
              (a, b) => a.slotNumber - b.slotNumber
            );
            const updatedPass = u.pass
              ? { ...u.pass, slotsUsed: Math.min(2, u.pass.slotsUsed + 1) }
              : u.pass;
            return {
              ...u,
              registrations: updatedRegs,
              pass: updatedPass,
            };
          })
        );

        setActionSuccess(res.message || "Event assigned successfully!");
        setActiveEventAction(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute event action";
      setActionError(msg);
    } finally {
      setIsSubmittingEventAction(false);
    }
  };

  const handleRemoveRegistration = async (regId: string, slotNum: number) => {
    if (!selectedUser) return;
    if (
      !confirm(
        `Are you sure you want to remove Slot #${slotNum}? This will free up the slot for this participant.`
      )
    ) {
      return;
    }

    setIsSubmittingEventAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await adminRemoveRegistrationAction({
        registrationId: regId,
        userId: selectedUser.id,
      });

      if (!res.success) {
        setActionError(res.error || "Failed to remove event registration");
        setIsSubmittingEventAction(false);
        return;
      }

      // Update selectedUser locally
      setSelectedUser((prev) => {
        if (!prev) return null;
        const updatedRegs = prev.registrations.filter((r) => r.id !== regId);
        const updatedPass = prev.pass
          ? { ...prev.pass, slotsUsed: Math.max(0, prev.pass.slotsUsed - 1) }
          : prev.pass;
        return {
          ...prev,
          registrations: updatedRegs,
          pass: updatedPass,
        };
      });

      // Update users list table locally
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== selectedUser.id) return u;
          const updatedRegs = u.registrations.filter((r) => r.id !== regId);
          const updatedPass = u.pass
            ? { ...u.pass, slotsUsed: Math.max(0, u.pass.slotsUsed - 1) }
            : u.pass;
          return {
            ...u,
            registrations: updatedRegs,
            pass: updatedPass,
          };
        })
      );

      setActionSuccess(`Slot #${slotNum} registration removed successfully.`);
      if (activeEventAction?.registrationId === regId) {
        setActiveEventAction(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove registration";
      setActionError(msg);
    } finally {
      setIsSubmittingEventAction(false);
    }
  };

  // Extract distinct categories for quick filtering in event changer
  const eventCategories = useMemo(() => {
    const cats = new Set<string>();
    availableEvents.forEach((e) => {
      if (e.categoryName) cats.add(e.categoryName);
    });
    return Array.from(cats).sort();
  }, [availableEvents]);

  // Filter available events for swap/assign
  const filteredAvailableEvents = useMemo(() => {
    let list = availableEvents;

    // Filter out the other slot's event so user can't register same event in both slots!
    const otherSlotEventId = selectedUser?.registrations.find(
      (r) => r.id !== activeEventAction?.registrationId
    )?.event.id;

    if (otherSlotEventId) {
      list = list.filter((e) => e.id !== otherSlotEventId);
    }

    // Filter category
    if (eventCategoryFilter !== "all") {
      list = list.filter((e) => e.categoryName === eventCategoryFilter);
    }

    // Filter search
    if (eventSearchTerm.trim()) {
      const q = eventSearchTerm.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.schoolOrDept?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q) ||
          e.categoryName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [availableEvents, eventCategoryFilter, eventSearchTerm, selectedUser, activeEventAction]);

  const selectedTargetEvent = useMemo(() => {
    if (!selectedNewEventId) return null;
    return availableEvents.find((e) => e.id === selectedNewEventId) || null;
  }, [availableEvents, selectedNewEventId]);

  // Dedicated full CSV export
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await exportAdminUsersCsvAction({
        search: searchQuery,
        passFilter,
        slotFilter,
        typeFilter,
        profileFilter,
        roleFilter,
      });

      if (!res.success || !res.csvContent) {
        alert(res.error || "Failed to generate CSV export");
        return;
      }

      const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `euphoria_2026_users_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPassFilter("all");
    setSlotFilter("all");
    setTypeFilter("all");
    setProfileFilter("all");
    setRoleFilter("all");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    passFilter !== "all" ||
    slotFilter !== "all" ||
    typeFilter !== "all" ||
    profileFilter !== "all" ||
    roleFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Dynamic Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Registered Accounts */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-300">
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live DB</span>
            </span>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3.5">
            Registered Accounts
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mt-0.5">
            {metrics.totalUsers.toLocaleString()}
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Completed Profiles</span>
              <span className="font-bold text-indigo-600 font-mono">
                {metrics.completedProfiles.toLocaleString()}{" "}
                <span className="text-slate-400 font-normal">
                  ({Math.round((metrics.completedProfiles / Math.max(1, metrics.totalUsers)) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((metrics.completedProfiles / Math.max(1, metrics.totalUsers)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Active Festival Passes */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-300">
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70 shadow-2xs">
              <span>{Math.round((metrics.totalPasses / Math.max(1, metrics.totalUsers)) * 100)}% Issued</span>
            </span>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3.5">
            Active Festival Passes
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mt-0.5">
            {metrics.totalPasses.toLocaleString()}
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Pending Checkout</span>
              <span className="font-bold text-amber-600 font-mono">
                {(metrics.totalUsers - metrics.totalPasses).toLocaleString()}{" "}
                <span className="text-slate-400 font-normal">
                  ({Math.round(((metrics.totalUsers - metrics.totalPasses) / Math.max(1, metrics.totalUsers)) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((metrics.totalPasses / Math.max(1, metrics.totalUsers)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Flagship Pass Holders */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all duration-300">
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-amber-500/5 blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Crown className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black text-amber-800 border border-amber-200/70 shadow-2xs">
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
              <span>₹300 Tier</span>
            </span>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3.5">
            Flagship Pass Holders
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mt-0.5">
            {metrics.proPasses.toLocaleString()}
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Standard Passes (₹200)</span>
            <span className="font-bold text-slate-800 font-mono">
              {metrics.standardPasses.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Filter Scope / Matching Directory */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-sky-300 hover:shadow-md transition-all duration-300">
          <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-sky-500/5 blur-2xl group-hover:bg-sky-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200/70 shadow-2xs">
              <span>Page {page} / {totalPages}</span>
            </span>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3.5">
            Matching Query
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mt-0.5">
            {totalCount.toLocaleString()}
          </div>
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Displaying Window</span>
            <span className="font-bold text-sky-700 font-mono">
              {fromRow}–{toRow} <span className="text-slate-400 font-normal">records</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Egress Controls Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Modern Search Input */}
          <div className="relative flex-1 min-w-[260px] group">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, mobile, register number, college, or pass code..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action & Limit Controls */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Display Limit Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 font-semibold shadow-2xs hover:border-slate-300 transition-colors">
              <span className="text-slate-400 text-[11px]">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            {/* Cache Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh server cache & fetch latest data"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Reset Filters (Visible when active) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>{isExporting ? "Exporting..." : `Export CSV (${totalCount.toLocaleString()})`}</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid with dynamic active highlighting */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2.5 border-t border-slate-100">
          {/* Pass Tier Filter */}
          <select
            value={passFilter}
            onChange={(e) => setPassFilter(e.target.value as any)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer transition-all ${
              passFilter !== "all"
                ? "border-indigo-400 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-400/30"
                : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300"
            }`}
          >
            <option value="all">All Pass Statuses</option>
            <option value="pro_pass">⭐ Pro Pass (₹300)</option>
            <option value="standard_pass">📌 Standard Pass (₹200)</option>
            <option value="no_pass">⚠️ No Pass Purchased</option>
          </select>

          {/* Slot Usage Filter */}
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value as any)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer transition-all ${
              slotFilter !== "all"
                ? "border-indigo-400 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-400/30"
                : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300"
            }`}
          >
            <option value="all">All Slot Usages</option>
            <option value="0">0/2 Slots (No Events)</option>
            <option value="1">1/2 Slots (1 Open Slot • ₹0)</option>
            <option value="2">2/2 Slots (Pass Complete)</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer transition-all ${
              typeFilter !== "all"
                ? "border-indigo-400 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-400/30"
                : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300"
            }`}
          >
            <option value="all">Internal &amp; External</option>
            <option value="internal">KARE Internal Students</option>
            <option value="external">External Delegates</option>
          </select>

          {/* Profile Status */}
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value as any)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer transition-all ${
              profileFilter !== "all"
                ? "border-indigo-400 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-400/30"
                : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300"
            }`}
          >
            <option value="all">All Profile States</option>
            <option value="completed">Completed Profile</option>
            <option value="incomplete">Incomplete Profile</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer transition-all ${
              roleFilter !== "all"
                ? "border-indigo-400 bg-indigo-50/50 text-indigo-950 font-bold ring-1 ring-indigo-400/30"
                : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300"
            }`}
          >
            <option value="all">All Roles</option>
            <option value="super_admin">👑 Super Admin</option>
            <option value="admin">🛡️ Platform Administrator</option>
            <option value="overall_coordinator">🌐 Overall Coordinator</option>
            <option value="staff_coordinator">👔 Staff Coordinator</option>
            <option value="student_coordinator">🎓 Student Coordinator</option>
            <option value="participant">👤 Participant Only</option>
          </select>
        </div>
      </div>

      {/* Users Master Table Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-2xs flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              <span>Fetching directory page...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Participant Details</th>
                <th className="px-4 py-3.5">Institution &amp; Dept</th>
                <th className="px-4 py-3.5">Festival Pass</th>
                <th className="px-4 py-3.5">Event Slots (1 &amp; 2)</th>
                <th className="px-4 py-3.5">Profile &amp; Role</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length > 0 ? (
                users.map((user) => {
                  const isPro = user.pass?.passTier === "pro_pass";
                  const slotsUsed = user.pass ? user.pass.slotsUsed : user.registrations.length;

                  // Dynamic avatar gradient
                  const avatarGradients = [
                    "from-indigo-500 to-purple-600",
                    "from-blue-500 to-cyan-600",
                    "from-emerald-500 to-teal-600",
                    "from-amber-500 to-orange-600",
                    "from-rose-500 to-pink-600",
                    "from-violet-600 to-indigo-700",
                  ];
                  let hash = 0;
                  for (let i = 0; i < user.fullName.length; i++) {
                    hash = user.fullName.charCodeAt(i) + ((hash << 5) - hash);
                  }
                  const avatarGradient = avatarGradients[Math.abs(hash) % avatarGradients.length];

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-indigo-50/20 transition-colors"
                    >
                      {/* Participant Details */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient} text-white font-extrabold text-xs shadow-2xs`}>
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenUserModal(user)}
                              className="font-bold text-slate-900 text-xs text-left hover:text-indigo-600 transition-colors block cursor-pointer"
                            >
                              {user.fullName}
                            </button>
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[210px]">
                              {user.email}
                            </div>
                            {user.mobileNumber && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                                <Phone className="h-2.5 w-2.5 text-slate-400" />
                                <span>{user.mobileNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* College / Institution */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 max-w-[210px]">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold border ${
                              user.participantType === "internal"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-purple-50 text-purple-800 border-purple-200"
                            }`}
                          >
                            {user.participantType === "internal" ? (
                              <>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>KARE Internal</span>
                              </>
                            ) : (
                              <>
                                <Globe className="h-2.5 w-2.5 text-purple-600" />
                                <span>External Delegate</span>
                              </>
                            )}
                          </span>
                          <div className="font-semibold text-slate-800 truncate text-[11px]">
                            {user.collegeName || user.department || "Kalasalingam Academy"}
                          </div>
                          {user.registerNumber && (
                            <div className="text-[10px] font-mono text-slate-400">
                              Reg: {user.registerNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Festival Pass */}
                      <td className="px-4 py-3">
                        {user.pass ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {isPro ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-50 to-amber-100/90 text-amber-900 border border-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs">
                                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                  <span>PRO PASS</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                  STD PASS
                                </span>
                              )}
                              <span className="font-mono text-[11px] font-bold text-slate-800">
                                {user.pass.passCode}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Paid: {formatCurrency(user.pass.amountPaid)}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-medium">
                            <AlertCircle className="h-3 w-3 text-slate-400" />
                            <span>No Pass</span>
                          </span>
                        )}
                      </td>

                      {/* Registered Slots */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5 max-w-[220px]">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                            <span>{slotsUsed}/2 Slots</span>
                            {slotsUsed === 1 && (
                              <span className="text-emerald-600 font-semibold">(1 Open Slot • ₹0)</span>
                            )}
                          </div>

                          {user.registrations.length > 0 ? (
                            <div className="space-y-1">
                              {user.registrations.map((reg) => (
                                <div
                                  key={reg.id}
                                  className="flex items-center justify-between gap-1 text-[11px] bg-slate-50/90 rounded-lg px-2 py-1 border border-slate-100/90 hover:border-slate-200 transition-colors"
                                >
                                  <span className="truncate max-w-[145px] font-medium text-slate-800">
                                    <span className="text-slate-400 font-mono text-[10px] mr-1">#{reg.slotNumber}</span>
                                    {reg.event.name}
                                  </span>
                                  {reg.isAttended ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                      <Check className="h-2.5 w-2.5" />
                                      <span>In</span>
                                    </span>
                                  ) : (
                                    <Clock className="h-3 w-3 text-slate-300 shrink-0" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic block">
                              No events chosen yet
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Profile & Roles */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {user.isProfileCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 text-[9px] font-bold">
                              <AlertCircle className="h-2.5 w-2.5 text-rose-600" />
                              <span>Incomplete</span>
                            </span>
                          )}

                          {user.roles.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {user.roles.map((r) => {
                                if (r === "super_admin") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded-md bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-500 text-white font-black px-1.5 py-0.5 text-[9px] uppercase tracking-wider shadow-2xs"
                                    >
                                      👑 SUPER ADMIN
                                    </span>
                                  );
                                }
                                if (r === "admin") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded-md bg-indigo-700 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                                    >
                                      🛡️ ADMIN
                                    </span>
                                  );
                                }
                                if (r === "overall_coordinator") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded-md bg-sky-600 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider shadow-2xs"
                                    >
                                      🌐 OVERALL COORD
                                    </span>
                                  );
                                }
                                if (r === "staff_coordinator") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded-md bg-amber-600 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider shadow-2xs"
                                    >
                                      👔 STAFF COORD
                                    </span>
                                  );
                                }
                                if (r === "student_coordinator") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded-md bg-emerald-700 text-white font-bold px-1.5 py-0.5 text-[9px] uppercase tracking-wider shadow-2xs"
                                    >
                                      🎓 STUDENT COORD
                                    </span>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Inspect Button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenUserModal(user)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-all duration-150 cursor-pointer group/btn"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">No Participants Found</h4>
                        <p className="text-xs text-slate-500 mt-1">No user accounts match the current filters or search query.</p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-600 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reset All Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Polished Modern Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>
              Showing <strong className="font-bold text-slate-900">{fromRow}</strong> to{" "}
              <strong className="font-bold text-slate-900">{toRow}</strong> of{" "}
              <strong className="font-bold text-slate-900">{totalCount.toLocaleString()}</strong> participants
            </span>
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 ml-1" />}
          </div>

          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => handlePageChange(1)}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => handlePageChange(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Current Page Badge */}
            <span className="px-3.5 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl shadow-2xs">
              Page {page} of {totalPages}
            </span>

            {/* Next Page */}
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => handlePageChange(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => handlePageChange(totalPages)}
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>

            {/* Jump to page form */}
            <form onSubmit={handleJumpPage} className="hidden md:flex items-center gap-1 ml-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                placeholder="Go to"
                className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-center font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <button
                type="submit"
                disabled={!jumpPage || isLoading}
                className="rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-600 disabled:opacity-40 cursor-pointer transition-colors"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* User Details & Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-4 sm:my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header & User Summary Banner */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-primary to-purple-600 text-white font-black text-base sm:text-lg shadow-sm ring-2 ring-white">
                    {selectedUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {selectedUser.fullName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold border ${
                          selectedUser.participantType === "internal"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-purple-50 text-purple-800 border-purple-200"
                        }`}
                      >
                        {selectedUser.participantType === "internal" ? "🎓 KARE Internal" : "🌐 External Delegate"}
                      </span>
                      {selectedUser.pass ? (
                        selectedUser.pass.passTier === "pro_pass" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            <span>PRO PASS</span>
                          </span>
                        ) : (
                          <span className="rounded-md bg-indigo-600 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            STD PASS
                          </span>
                        )
                      ) : (
                        <span className="rounded-md bg-slate-200 text-slate-600 px-2 py-0.5 text-[9px] font-medium">
                          No Pass
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono text-slate-600">{selectedUser.email}</span>
                      {selectedUser.mobileNumber && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-slate-600">{selectedUser.mobileNumber}</span>
                        </>
                      )}
                      {selectedUser.collegeName && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[220px] text-slate-600">{selectedUser.collegeName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Tabs Bar */}
              <div className="flex items-center gap-1.5 pt-3.5 mt-3 border-t border-slate-200/60 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setModalActiveTab("events");
                    setActiveEventAction(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    modalActiveTab === "events"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <Zap className={`h-3.5 w-3.5 ${modalActiveTab === "events" ? "text-amber-400" : "text-slate-400"}`} />
                  <span>Competitions &amp; Pass</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                      modalActiveTab === "events" ? "bg-slate-800 text-amber-300" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selectedUser.registrations.length}/2
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalActiveTab("profile");
                    setActiveEventAction(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    modalActiveTab === "profile"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <Users className={`h-3.5 w-3.5 ${modalActiveTab === "profile" ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>Personal Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalActiveTab("roles");
                    setActiveEventAction(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    modalActiveTab === "roles"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <ShieldCheck className={`h-3.5 w-3.5 ${modalActiveTab === "roles" ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>Roles &amp; RBAC</span>
                  {selectedUser.roles.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                        modalActiveTab === "roles" ? "bg-slate-800 text-indigo-300" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {selectedUser.roles.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalActiveTab("orders");
                    setActiveEventAction(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                    modalActiveTab === "orders"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <CreditCard className={`h-3.5 w-3.5 ${modalActiveTab === "orders" ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>Payment Orders</span>
                  {userOrders.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                        modalActiveTab === "orders" ? "bg-slate-800 text-emerald-300" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {userOrders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body with Active Tab View */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Alert Feedback Notifications */}
              {actionSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionSuccess(null)}
                    className="p-1 text-emerald-600 hover:text-emerald-900 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {actionError && (
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 font-medium flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionError(null)}
                    className="p-1 text-rose-600 hover:text-rose-900 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 1: COMPETITIONS & FESTIVAL PASS */}
              {/* ========================================================================= */}
              {modalActiveTab === "events" && (
                <div className="space-y-5">
                  {/* Festival Pass Status Banner */}
                  <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-purple-50/20 p-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm">
                              {selectedUser.pass?.passCode || "No Active Pass"}
                            </span>
                            {selectedUser.pass?.passTier === "pro_pass" ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-2 py-0.5 text-[9px] font-black uppercase">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                <span>PRO PASS</span>
                              </span>
                            ) : selectedUser.pass ? (
                              <span className="rounded bg-indigo-600 text-white px-2 py-0.5 text-[9px] font-bold uppercase">
                                STANDARD PASS
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            Fee Paid:{" "}
                            <strong className="text-slate-800 font-mono">
                              {selectedUser.pass ? formatCurrency(selectedUser.pass.amountPaid) : "₹0"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Slot Utilization Status */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Slots Allocated</span>
                          <span className="font-mono font-extrabold text-slate-900 text-xs">
                            {selectedUser.registrations.length} of 2 Slots
                          </span>
                        </div>
                        <div className="flex items-center gap-1 pl-2">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              selectedUser.registrations.length >= 1 ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-slate-200"
                            }`}
                            title="Slot #1"
                          />
                          <div
                            className={`h-3 w-3 rounded-full ${
                              selectedUser.registrations.length >= 2 ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-slate-200"
                            }`}
                            title="Slot #2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inline Change / Assign Event Drawer */}
                  {activeEventAction && (
                    <div className="rounded-3xl border-2 border-indigo-400/80 bg-gradient-to-b from-indigo-50/80 via-white to-slate-50 p-4 sm:p-5 space-y-4 shadow-lg ring-4 ring-indigo-100/60 animate-in fade-in slide-in-from-top-3 duration-200">
                      <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                            <ArrowLeftRight className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                              {activeEventAction.mode === "change"
                                ? `Change Event for Slot #${activeEventAction.slotNumber}`
                                : `Assign Event to Slot #${activeEventAction.slotNumber}`}
                            </h4>
                            {activeEventAction.currentEventName && (
                              <p className="text-[11px] text-slate-500">
                                Currently: <strong className="text-slate-800">{activeEventAction.currentEventName}</strong>
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveEventAction(null)}
                          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Search Bar & Category Filter */}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={eventSearchTerm}
                              onChange={(e) => setEventSearchTerm(e.target.value)}
                              placeholder="Search competition name, department, venue..."
                              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
                            />
                          </div>

                          {eventCategories.length > 0 && (
                            <select
                              value={eventCategoryFilter}
                              onChange={(e) => setEventCategoryFilter(e.target.value)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs sm:w-48 font-medium"
                            >
                              <option value="all">All Categories ({availableEvents.length})</option>
                              {eventCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Competition Catalog Picker */}
                        {loadingEvents ? (
                          <div className="flex items-center justify-center p-8 rounded-2xl bg-white border border-slate-200 text-slate-400 gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            <span>Loading Euphoria event catalog...</span>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-inner">
                            {filteredAvailableEvents.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-xs italic">
                                No competitions match your search query.
                              </div>
                            ) : (
                              filteredAvailableEvents.map((evt) => {
                                const isSelected = selectedNewEventId === evt.id;
                                const isCurrentEvent = activeEventAction.currentEventId === evt.id;
                                const isInternal = selectedUser.participantType === "internal";
                                const isFull = evt.isTotalFull;
                                const isKluBlocked = isInternal && evt.isKluBlocked;

                                return (
                                  <div
                                    key={evt.id}
                                    onClick={() => {
                                      if (!isCurrentEvent) setSelectedNewEventId(evt.id);
                                    }}
                                    className={`p-3 flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-indigo-50/90 border-l-4 border-indigo-600"
                                        : isCurrentEvent
                                        ? "bg-slate-50 opacity-40 cursor-not-allowed"
                                        : "hover:bg-slate-50/80"
                                    }`}
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-extrabold text-slate-900 truncate">
                                          {evt.name}
                                        </span>
                                        {evt.isProEvent && (
                                          <span className="rounded bg-amber-500 text-white px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider">
                                            PRO
                                          </span>
                                        )}
                                        <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px] font-semibold">
                                          {evt.categoryName}
                                        </span>
                                        {isCurrentEvent && (
                                          <span className="text-[9px] font-bold text-slate-400 italic">
                                            (Current Event)
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span>{evt.venue}</span>
                                        <span>•</span>
                                        <span>{evt.eventDate ? formatDate(evt.eventDate) : "Schedule TBD"}</span>
                                        {evt.startTime && <span>({evt.startTime})</span>}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {isFull ? (
                                        <span className="rounded-lg bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 text-[9px] font-bold">
                                          Full ({evt.totalRegistered}/{evt.participantLimit})
                                        </span>
                                      ) : isKluBlocked ? (
                                        <span className="rounded-lg bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[9px] font-bold">
                                          KLU Full
                                        </span>
                                      ) : (
                                        <span className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold font-mono">
                                          {Math.max(0, evt.participantLimit - evt.totalRegistered)} left
                                        </span>
                                      )}

                                      {isSelected && (
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                                          <Check className="h-3 w-3" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected Target Preview & Options */}
                      {selectedTargetEvent && (
                        <div className="space-y-2.5 p-3.5 rounded-2xl bg-white border border-indigo-200 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">
                                Selected Replacement Competition
                              </span>
                              <span className="text-sm font-extrabold text-slate-900">{selectedTargetEvent.name}</span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500">
                              {selectedTargetEvent.venue} • {selectedTargetEvent.eventDate ? formatDate(selectedTargetEvent.eventDate) : ""}
                            </span>
                          </div>

                          {/* Capacity / Restriction Banner */}
                          {(selectedTargetEvent.isTotalFull ||
                            (selectedUser.participantType === "internal" && selectedTargetEvent.isKluBlocked) ||
                            (selectedTargetEvent.isProEvent && selectedUser.pass?.passTier !== "pro_pass")) && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  {selectedTargetEvent.isTotalFull && (
                                    <p className="font-bold text-[11px]">
                                      ⚠️ Event is at capacity ({selectedTargetEvent.totalRegistered}/{selectedTargetEvent.participantLimit} seats taken).
                                    </p>
                                  )}
                                  {selectedUser.participantType === "internal" && selectedTargetEvent.isKluBlocked && (
                                    <p className="font-bold text-[11px]">
                                      ⚠️ Kalasalingam University quota is full or restricted for this competition.
                                    </p>
                                  )}
                                  {selectedTargetEvent.isProEvent && selectedUser.pass?.passTier !== "pro_pass" && (
                                    <p className="font-bold text-[11px]">
                                      ⚠️ PRO Competition: Participant holds a Standard Festival Pass.
                                    </p>
                                  )}
                                </div>
                              </div>

                              <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 text-[11px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={overrideCapacity}
                                  onChange={(e) => setOverrideCapacity(e.target.checked)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Force Override (Bypass capacity &amp; pass restrictions as Administrator)</span>
                              </label>
                            </div>
                          )}

                          {/* Attendance Reset Notice if changing attended slot */}
                          {activeEventAction.isAttended && (
                            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-sky-600 shrink-0" />
                                <span className="text-[11px]">
                                  User is currently marked <strong>Attended</strong>. Changing the event will reset attendance status.
                                </span>
                              </div>
                              <label className="flex items-center gap-1.5 font-bold text-[10px] text-sky-950 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={resetAttendance}
                                  onChange={(e) => setResetAttendance(e.target.checked)}
                                  className="rounded text-indigo-600"
                                />
                                <span>Reset Attendance</span>
                              </label>
                            </div>
                          )}

                          {/* Reason Input */}
                          <div>
                            <input
                              type="text"
                              value={changeReason}
                              onChange={(e) => setChangeReason(e.target.value)}
                              placeholder="Reason for change (e.g. Schedule clash, Desk request, Coordinator change)..."
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveEventAction(null)}
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={
                            !selectedNewEventId ||
                            isSubmittingEventAction ||
                            (Boolean(
                              selectedTargetEvent?.isTotalFull ||
                                (selectedUser.participantType === "internal" && selectedTargetEvent?.isKluBlocked) ||
                                (selectedTargetEvent?.isProEvent && selectedUser.pass?.passTier !== "pro_pass")
                            ) &&
                              !overrideCapacity)
                          }
                          onClick={handleConfirmChangeEvent}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs shadow-md transition-colors"
                        >
                          {isSubmittingEventAction ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Updating Event...</span>
                            </>
                          ) : activeEventAction.mode === "change" ? (
                            <>
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                              <span>Confirm Event Change</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>Confirm Slot Assignment</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2 Event Slots Grid (Slot #1 and Slot #2) */}
                  <div className="space-y-2">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">
                      Assigned Event Slots
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* SLOT #1 CARD */}
                      {(() => {
                        const slot1Reg = selectedUser.registrations.find((r) => r.slotNumber === 1);
                        if (slot1Reg) {
                          return (
                            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-sm transition-all space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-black uppercase">
                                      SLOT #1
                                    </span>
                                    {slot1Reg.event.isProEvent && (
                                      <span className="rounded-lg bg-amber-500 text-white px-2 py-0.5 text-[9px] font-black uppercase">
                                        PRO
                                      </span>
                                    )}
                                  </div>

                                  {slot1Reg.isAttended ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold">
                                      <Check className="h-3 w-3 text-emerald-600" />
                                      <span>Attended</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      <span>Pending Check-in</span>
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                                    {slot1Reg.event.name}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                                    <span>{slot1Reg.event.venue || "Campus Venue"}</span>
                                    <span>•</span>
                                    <span>{slot1Reg.event.eventDate ? formatDate(slot1Reg.event.eventDate) : "Date TBD"}</span>
                                  </div>
                                </div>
                              </div>

                              {(currentUserRole?.roleLevel ?? 0) >= 3 && (
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartChangeEvent(slot1Reg)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition-all cursor-pointer shadow-2xs group"
                                  >
                                    <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600 group-hover:text-white" />
                                    <span>Change Event</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSubmittingEventAction}
                                    onClick={() => handleRemoveRegistration(slot1Reg.id, 1)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Remove this slot registration"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-2.5">
                              <span className="rounded-lg bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase">
                                SLOT #1 EMPTY
                              </span>
                              <p className="text-xs text-slate-500">No competition assigned to Slot #1.</p>
                              {(currentUserRole?.roleLevel ?? 0) >= 3 && (
                                <button
                                  type="button"
                                  onClick={handleStartAssignEvent}
                                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Assign Event to Slot #1</span>
                                </button>
                              )}
                            </div>
                          );
                        }
                      })()}

                      {/* SLOT #2 CARD */}
                      {(() => {
                        const slot2Reg = selectedUser.registrations.find((r) => r.slotNumber === 2);
                        if (slot2Reg) {
                          return (
                            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-sm transition-all space-y-3 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-black uppercase">
                                      SLOT #2
                                    </span>
                                    {slot2Reg.event.isProEvent && (
                                      <span className="rounded-lg bg-amber-500 text-white px-2 py-0.5 text-[9px] font-black uppercase">
                                        PRO
                                      </span>
                                    )}
                                  </div>

                                  {slot2Reg.isAttended ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold">
                                      <Check className="h-3 w-3 text-emerald-600" />
                                      <span>Attended</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      <span>Pending Check-in</span>
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                                    {slot2Reg.event.name}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                                    <span>{slot2Reg.event.venue || "Campus Venue"}</span>
                                    <span>•</span>
                                    <span>{slot2Reg.event.eventDate ? formatDate(slot2Reg.event.eventDate) : "Date TBD"}</span>
                                  </div>
                                </div>
                              </div>

                              {(currentUserRole?.roleLevel ?? 0) >= 3 && (
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartChangeEvent(slot2Reg)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition-all cursor-pointer shadow-2xs group"
                                  >
                                    <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600 group-hover:text-white" />
                                    <span>Change Event</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isSubmittingEventAction}
                                    onClick={() => handleRemoveRegistration(slot2Reg.id, 2)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Remove this slot registration"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-5 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 flex flex-col items-center justify-center text-center space-y-2.5">
                              <span className="rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                                SLOT #2 AVAILABLE (₹0)
                              </span>
                              <p className="text-xs text-slate-500 max-w-[220px]">
                                Participant is eligible to select a 2nd competition under their festival pass.
                              </p>
                              {(currentUserRole?.roleLevel ?? 0) >= 3 && (
                                <button
                                  type="button"
                                  onClick={handleStartAssignEvent}
                                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Assign Event to Slot #2</span>
                                </button>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: PERSONAL & ACADEMIC PROFILE */}
              {/* ========================================================================= */}
              {modalActiveTab === "profile" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                      Participant Demographics &amp; Academic Records
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(!isEditMode)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{isEditMode ? "Cancel Edit" : "Edit Profile"}</span>
                    </button>
                  </div>

                  {isEditMode ? (
                    <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={editFormData.fullName}
                          onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          value={editFormData.mobileNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Register Number
                        </label>
                        <input
                          type="text"
                          value={editFormData.registerNumber}
                          onChange={(e) => setEditFormData({ ...editFormData, registerNumber: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Delegate Type
                        </label>
                        <select
                          value={editFormData.participantType}
                          onChange={(e) => setEditFormData({ ...editFormData, participantType: e.target.value as any })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        >
                          <option value="internal">KARE Internal</option>
                          <option value="external">External Delegate</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          College / Institution
                        </label>
                        <input
                          type="text"
                          value={editFormData.collegeName}
                          onChange={(e) => setEditFormData({ ...editFormData, collegeName: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setIsEditMode(false)}
                          className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="rounded-xl bg-slate-900 px-5 py-1.5 font-bold text-white hover:bg-indigo-600 disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
                        >
                          {isSubmitting ? "Saving..." : "Save Profile"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Participant Type
                        </span>
                        <span className="font-bold text-slate-900 capitalize text-xs">
                          {selectedUser.participantType === "internal" ? "🎓 KARE Internal" : "🌐 External Delegate"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Register Number
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-xs">
                          {selectedUser.registerNumber || "Not Provided"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Mobile Contact
                        </span>
                        <span className="font-bold text-slate-900 font-mono text-xs">
                          {selectedUser.mobileNumber || "Not Provided"}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          College / Institution
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {selectedUser.collegeName || selectedUser.department || "Kalasalingam Academy"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Course &amp; Year
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {selectedUser.course || "General"} {selectedUser.yearOfStudy ? `(Yr ${selectedUser.yearOfStudy})` : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: ROLES & RBAC GOVERNANCE */}
              {/* ========================================================================= */}
              {modalActiveTab === "roles" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-indigo-600" />
                      <span>RBAC Governance &amp; Role Assignments</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Your Authority: {currentUserRole?.isSuperAdmin ? "👑 Super Admin (L4)" : currentUserRole?.roleLevel === 3 ? "🛡️ Admin (L3)" : "Staff / Coordinator"}
                    </span>
                  </div>

                  {selectedUser.email.toLowerCase().trim() === "smithlivingston2005@gmail.com" || selectedUser.roles.includes("super_admin") ? (
                    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-indigo-50/40 to-amber-50/30 p-4 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-700 text-white">
                          <Crown className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-purple-900 tracking-tight">
                            Root Super Administrator (Developer)
                          </span>
                          <span className="block text-[10px] text-purple-700 font-medium">
                            Permanent developer account with full site control &amp; admin delegation authority
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-9 pt-0.5">
                        This root account holds immutable governance over Euphoria 2026. Roles cannot be modified or revoked.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Admin */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${selectedUser.roles.includes("admin") ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className={`h-4 w-4 ${selectedUser.roles.includes("admin") ? "text-indigo-600" : "text-slate-400"}`} />
                            <span className="text-xs font-bold text-slate-900">Admin</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-slate-400">Level 3</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-3 min-h-[30px]">
                          Event control, finances, pass verification, coordinator delegation.
                        </p>
                        {currentUserRole?.isSuperAdmin ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleToggleRole("admin", selectedUser.roles.includes("admin") ? "revoke" : "assign")}
                            className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                              selectedUser.roles.includes("admin")
                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            {selectedUser.roles.includes("admin") ? "Revoke Admin" : "Grant Admin"}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-semibold">
                            <Lock className="h-3 w-3" />
                            <span>Super Admin Only</span>
                          </div>
                        )}
                      </div>

                      {/* 2. Overall Coordinator */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${selectedUser.roles.includes("overall_coordinator") ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Globe className={`h-4 w-4 ${selectedUser.roles.includes("overall_coordinator") ? "text-sky-600" : "text-slate-400"}`} />
                            <span className="text-xs font-bold text-slate-900">Overall Coord</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-slate-400">Level 2</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-3 min-h-[30px]">
                          Global read-only oversight across all 61 competitions. Custom reports.
                        </p>
                        {(currentUserRole?.roleLevel ?? 0) >= 3 ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleToggleRole("overall_coordinator", selectedUser.roles.includes("overall_coordinator") ? "revoke" : "assign")}
                            className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                              selectedUser.roles.includes("overall_coordinator")
                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                : "bg-sky-600 text-white hover:bg-sky-700"
                            }`}
                          >
                            {selectedUser.roles.includes("overall_coordinator") ? "Revoke Overall" : "Grant Overall"}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-semibold">
                            <Lock className="h-3 w-3" />
                            <span>Admin Required</span>
                          </div>
                        )}
                      </div>

                      {/* 3. Staff Coordinator */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${selectedUser.roles.includes("staff_coordinator") ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Building className={`h-4 w-4 ${selectedUser.roles.includes("staff_coordinator") ? "text-amber-600" : "text-slate-400"}`} />
                            <span className="text-xs font-bold text-slate-900">Staff Coord</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-slate-400">Level 2</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-3 min-h-[30px]">
                          Faculty overseer. Can assign event student coordinators.
                        </p>
                        {(currentUserRole?.roleLevel ?? 0) >= 3 ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleToggleRole("staff_coordinator", selectedUser.roles.includes("staff_coordinator") ? "revoke" : "assign")}
                            className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                              selectedUser.roles.includes("staff_coordinator")
                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                : "bg-amber-600 text-white hover:bg-amber-700"
                            }`}
                          >
                            {selectedUser.roles.includes("staff_coordinator") ? "Revoke Staff" : "Grant Staff"}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-semibold">
                            <Lock className="h-3 w-3" />
                            <span>Admin Required</span>
                          </div>
                        )}
                      </div>

                      {/* 4. Student Coordinator */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${selectedUser.roles.includes("student_coordinator") ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className={`h-4 w-4 ${selectedUser.roles.includes("student_coordinator") ? "text-emerald-600" : "text-slate-400"}`} />
                            <span className="text-xs font-bold text-slate-900">Student Coord</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-slate-400">Level 1</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-3 min-h-[30px]">
                          Field lead. Check-ins, attendance scans, &amp; participant assistance.
                        </p>
                        {(currentUserRole?.roleLevel ?? 0) >= 2 ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleToggleRole("student_coordinator", selectedUser.roles.includes("student_coordinator") ? "revoke" : "assign")}
                            className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                              selectedUser.roles.includes("student_coordinator")
                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            {selectedUser.roles.includes("student_coordinator") ? "Revoke Student" : "Grant Student"}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[10px] font-semibold">
                            <Lock className="h-3 w-3" />
                            <span>Staff Required</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: ORDERS & PAYMENT TRANSACTIONS */}
              {/* ========================================================================= */}
              {modalActiveTab === "orders" && (
                <div className="space-y-4">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">
                    Recorded Payment Orders &amp; Checkout History
                  </span>

                  {loadingOrders ? (
                    <div className="flex items-center justify-center p-8 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      <span>Loading user order telemetry...</span>
                    </div>
                  ) : userOrders.length > 0 ? (
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      {userOrders.map((ord) => (
                        <div key={ord.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                            <span className="text-[10px] text-slate-400 block">{formatDate(ord.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-extrabold text-slate-900">{formatCurrency(ord.amount)}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ord.status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-50 text-slate-400 italic text-center border border-dashed border-slate-200">
                      No payment orders found on record for this user.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-3.5 px-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Inspecting <span className="font-bold text-slate-700">{selectedUser.fullName}</span> • Euphoria 2026 Admin Portal
              </span>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white text-xs hover:bg-primary transition-colors cursor-pointer shadow-2xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

