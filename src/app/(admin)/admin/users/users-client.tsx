"use client";

import { useState, useMemo } from "react";
import {
  AdminUserListItem,
  updateUserProfileAdmin,
  updateUserRoleAdmin,
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
} from "lucide-react";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils";

export function UsersAdminClient({
  initialUsers,
  currentUserRole,
}: {
  initialUsers: AdminUserListItem[];
  currentUserRole?: CallerAuthInfo | null;
}) {
  const [users, setUsers] = useState<AdminUserListItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [passFilter, setPassFilter] = useState<"all" | "pro_pass" | "standard_pass" | "no_pass">("all");
  const [slotFilter, setSlotFilter] = useState<"all" | "0" | "1" | "2">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "internal" | "external">("all");
  const [profileFilter, setProfileFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "super_admin" | "admin" | "staff_coordinator" | "student_coordinator" | "participant">("all");

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
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

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const name = u.fullName.toLowerCase();
      const email = u.email.toLowerCase();
      const mobile = (u.mobileNumber || "").toLowerCase();
      const regNo = (u.registerNumber || "").toLowerCase();
      const college = (u.collegeName || "").toLowerCase();
      const passCode = (u.pass?.passCode || "").toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        mobile.includes(q) ||
        regNo.includes(q) ||
        college.includes(q) ||
        passCode.includes(q);

      if (!matchesSearch) return false;

      // Pass Filter
      if (passFilter !== "all") {
        if (passFilter === "no_pass" && u.pass) return false;
        if (passFilter === "pro_pass" && u.pass?.passTier !== "pro_pass") return false;
        if (passFilter === "standard_pass" && u.pass?.passTier !== "standard_pass") return false;
      }

      // Slot Filter
      if (slotFilter !== "all") {
        const slotsUsed = u.pass ? u.pass.slotsUsed : u.registrations.length;
        if (String(slotsUsed) !== slotFilter) return false;
      }

      // Type Filter
      if (typeFilter !== "all" && u.participantType !== typeFilter) return false;

      // Profile Completion Filter
      if (profileFilter === "completed" && !u.isProfileCompleted) return false;
      if (profileFilter === "incomplete" && u.isProfileCompleted) return false;

      // Role Filter
      if (roleFilter !== "all") {
        if (roleFilter === "participant" && u.roles.length > 0) return false;
        if (roleFilter !== "participant" && !u.roles.includes(roleFilter)) return false;
      }

      return true;
    });
  }, [
    users,
    searchQuery,
    passFilter,
    slotFilter,
    typeFilter,
    profileFilter,
    roleFilter,
  ]);

  // Overall metric aggregations
  const totalPassCount = users.filter((u) => u.pass !== null).length;
  const proPassCount = users.filter((u) => u.pass?.passTier === "pro_pass").length;
  const completedProfileCount = users.filter((u) => u.isProfileCompleted).length;

  const handleOpenUserModal = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setIsEditMode(false);
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
    roleId: "admin" | "staff_coordinator" | "student_coordinator",
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

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Sl No",
      "Full Name",
      "Email",
      "Mobile Number",
      "Participant Type",
      "Register Number",
      "College / Institution",
      "Department",
      "Course & Year",
      "Profile Completed",
      "Pass Code",
      "Pass Tier",
      "Slots Used",
      "Amount Paid",
      "Slot 1 Event",
      "Slot 1 Attended",
      "Slot 2 Event",
      "Slot 2 Attended",
      "Roles",
      "Registered On",
    ];

    const rows = filteredUsers.map((u, idx) => {
      const slot1 = u.registrations.find((r) => r.slotNumber === 1);
      const slot2 = u.registrations.find((r) => r.slotNumber === 2);

      return [
        idx + 1,
        `"${u.fullName}"`,
        `"${u.email}"`,
        `"${u.mobileNumber || ""}"`,
        `"${u.participantType}"`,
        `"${u.registerNumber || ""}"`,
        `"${u.collegeName || ""}"`,
        `"${u.department || ""}"`,
        `"${u.course || ""} Year ${u.yearOfStudy || ""}"`,
        u.isProfileCompleted ? "Yes" : "No",
        `"${u.pass?.passCode || "N/A"}"`,
        `"${u.pass ? (u.pass.passTier === "pro_pass" ? "Pro Pass" : "Standard Pass") : "No Pass"}"`,
        u.pass ? u.pass.slotsUsed : u.registrations.length,
        u.pass ? u.pass.amountPaid : 0,
        `"${slot1?.event?.name || "None"}"`,
        slot1 ? (slot1.isAttended ? "Yes" : "No") : "N/A",
        `"${slot2?.event?.name || "None"}"`,
        slot2 ? (slot2.isAttended ? "Yes" : "No") : "N/A",
        `"${u.roles.join(", ") || "Participant"}"`,
        `"${new Date(u.createdAt).toLocaleDateString()}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `euphoria_2026_users_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="space-y-5">
      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Registered Accounts</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
            {users.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {completedProfileCount} Completed Profiles
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs">
          <div className="text-xs font-bold text-indigo-900 flex items-center gap-1">
            <Layers className="h-3 w-3 text-primary" />
            <span>Active Festival Passes</span>
          </div>
          <div className="text-2xl font-black text-indigo-950 font-mono mt-0.5">
            {totalPassCount}
          </div>
          <div className="text-[11px] text-indigo-800 mt-0.5">
            {users.length - totalPassCount} Pass Pending
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>Flagship Pass Holders</span>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
            {proPassCount}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5">
            ₹300 Tier Delegates
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
            <Users className="h-3 w-3 text-emerald-600" />
            <span>Filtered Users</span>
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono mt-0.5">
            {filteredUsers.length}
          </div>
          <div className="text-[11px] text-emerald-800 mt-0.5">
            Matching current query
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by delegate name, email, mobile, reg no, college, or pass code..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 p-1 rounded-full text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary transition-colors cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV ({filteredUsers.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          {/* Pass Tier Filter */}
          <select
            value={passFilter}
            onChange={(e) => setPassFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
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
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
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
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="all">Internal &amp; External</option>
            <option value="internal">KARE Internal Students</option>
            <option value="external">External Delegates</option>
          </select>

          {/* Profile Status */}
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="all">All Profile States</option>
            <option value="completed">Completed Profile</option>
            <option value="incomplete">Incomplete Profile</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">👑 Super Admin</option>
            <option value="admin">🛡️ Platform Administrator</option>
            <option value="staff_coordinator">👔 Staff Coordinator</option>
            <option value="student_coordinator">🎓 Student Coordinator</option>
            <option value="participant">👤 Participant Only</option>
          </select>
        </div>
      </div>

      {/* Users Master Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isPro = user.pass?.passTier === "pro_pass";
                  const slotsUsed = user.pass ? user.pass.slotsUsed : user.registrations.length;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Participant Details */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {user.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {user.email}
                            </div>
                            {user.mobileNumber && (
                              <div className="text-[10px] text-slate-400">
                                Tel: {user.mobileNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* College / Institution */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 max-w-[200px]">
                          <span
                            className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold border ${
                              user.participantType === "internal"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-purple-50 text-purple-800 border-purple-200"
                            }`}
                          >
                            {user.participantType === "internal"
                              ? "KARE Internal"
                              : "External"}
                          </span>
                          <div className="font-semibold text-slate-800 truncate text-[11px]">
                            {user.collegeName || user.department || "Kalasalingam University"}
                          </div>
                          {user.registerNumber && (
                            <div className="text-[10px] font-mono text-slate-500">
                              Reg: {user.registerNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Festival Pass */}
                      <td className="px-4 py-3 font-mono">
                        {user.pass ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-900 block text-[11px]">
                              {user.pass.passCode}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {isPro ? (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-extrabold px-1.5 py-0.2 text-[9px]">
                                  <Star className="h-2.5 w-2.5 fill-amber-500" />
                                  <span>PRO PASS • ₹{user.pass.amountPaid}</span>
                                </span>
                              ) : (
                                <span className="rounded bg-indigo-50 text-primary border border-indigo-200 font-bold px-1.5 py-0.2 text-[9px]">
                                  STD PASS • ₹{user.pass.amountPaid}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-medium">
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
                                  className="flex items-center justify-between gap-1 text-[11px] bg-slate-50 rounded-lg px-2 py-0.5 border border-slate-100"
                                >
                                  <span className="truncate max-w-[150px] font-medium text-slate-800">
                                    #{reg.slotNumber}: {reg.event.name}
                                  </span>
                                  {reg.isAttended ? (
                                    <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
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
                            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold">
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
                                      className="rounded bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-500 text-white font-black px-1.5 py-0.2 text-[9px] uppercase tracking-wider shadow-2xs"
                                    >
                                      👑 SUPER ADMIN
                                    </span>
                                  );
                                }
                                if (r === "admin") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded bg-indigo-700 text-white font-bold px-1.5 py-0.2 text-[9px] uppercase tracking-wider"
                                    >
                                      🛡️ ADMIN
                                    </span>
                                  );
                                }
                                if (r === "staff_coordinator") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded bg-amber-600 text-white font-bold px-1.5 py-0.2 text-[9px] uppercase tracking-wider"
                                    >
                                      👔 STAFF
                                    </span>
                                  );
                                }
                                if (r === "student_coordinator") {
                                  return (
                                    <span
                                      key={r}
                                      className="rounded bg-teal-700 text-white font-bold px-1.5 py-0.2 text-[9px] uppercase tracking-wider"
                                    >
                                      🎓 COORD
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    key={r}
                                    className="rounded bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 text-[9px] capitalize"
                                  >
                                    {r}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenUserModal(user)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No participant accounts found matching current query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details & Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white font-black text-sm">
                  {selectedUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedUser.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Alert Feedback */}
              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                  {actionError}
                </div>
              )}

              {/* Personal Details (View or Edit) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                    Personal &amp; Academic Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>{isEditMode ? "Cancel Edit" : "Edit Profile"}</span>
                  </button>
                </div>

                {isEditMode ? (
                  <form onSubmit={handleSaveProfile} className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.fullName}
                        onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
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
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Delegate Type
                      </label>
                      <select
                        value={editFormData.participantType}
                        onChange={(e) => setEditFormData({ ...editFormData, participantType: e.target.value as any })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                      >
                        <option value="internal">KARE Internal</option>
                        <option value="external">External Delegate</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        College / Institution
                      </label>
                      <input
                        type="text"
                        value={editFormData.collegeName}
                        onChange={(e) => setEditFormData({ ...editFormData, collegeName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-xl bg-slate-900 px-4 py-1.5 font-bold text-white hover:bg-primary disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Participant Type
                      </span>
                      <span className="font-bold text-slate-900 capitalize">
                        {selectedUser.participantType === "internal" ? "KARE Internal" : "External Delegate"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Register Number
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {selectedUser.registerNumber || "Not Provided"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Mobile Contact
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {selectedUser.mobileNumber || "Not Provided"}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        College / Institution
                      </span>
                      <span className="font-bold text-slate-900">
                        {selectedUser.collegeName || selectedUser.department || "Kalasalingam Academy"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Course &amp; Year
                      </span>
                      <span className="font-bold text-slate-900">
                        {selectedUser.course || "General"} {selectedUser.yearOfStudy ? `(Yr ${selectedUser.yearOfStudy})` : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hierarchical RBAC Role Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* 1. Platform Admin Role */}
                    <div className={`p-3 rounded-2xl border transition-all ${selectedUser.roles.includes("admin") ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className={`h-4 w-4 ${selectedUser.roles.includes("admin") ? "text-indigo-600" : "text-slate-400"}`} />
                          <span className="text-xs font-bold text-slate-900">Admin</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400">Level 3</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-3">
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

                    {/* 2. Staff Coordinator Role */}
                    <div className={`p-3 rounded-2xl border transition-all ${selectedUser.roles.includes("staff_coordinator") ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Building className={`h-4 w-4 ${selectedUser.roles.includes("staff_coordinator") ? "text-amber-600" : "text-slate-400"}`} />
                          <span className="text-xs font-bold text-slate-900">Staff Coord</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400">Level 2</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-3">
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

                    {/* 3. Student Coordinator Role */}
                    <div className={`p-3 rounded-2xl border transition-all ${selectedUser.roles.includes("student_coordinator") ? "border-teal-300 bg-teal-50/50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className={`h-4 w-4 ${selectedUser.roles.includes("student_coordinator") ? "text-teal-600" : "text-slate-400"}`} />
                          <span className="text-xs font-bold text-slate-900">Student Coord</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400">Level 1</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-3">
                        Attendance scanner &amp; desk operations on event day.
                      </p>
                      {(currentUserRole?.roleLevel ?? 0) >= 2 ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleToggleRole("student_coordinator", selectedUser.roles.includes("student_coordinator") ? "revoke" : "assign")}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs ${
                            selectedUser.roles.includes("student_coordinator")
                              ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                              : "bg-teal-600 text-white hover:bg-teal-700"
                          }`}
                        >
                          {selectedUser.roles.includes("student_coordinator") ? "Revoke Coord" : "Grant Coord"}
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

              {/* Festival Pass & Slot Status */}
              <div className="space-y-3">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Festival Pass Allocation
                </span>

                {selectedUser.pass ? (
                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {selectedUser.pass.passCode}
                        </span>
                        {selectedUser.pass.passTier === "pro_pass" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                            <Star className="h-3 w-3 fill-current" />
                            <span>PRO PASS</span>
                          </span>
                        ) : (
                          <span className="rounded bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase">
                            STANDARD PASS
                          </span>
                        )}
                      </div>

                      <span className="font-mono font-bold text-slate-900">
                        Fee Paid: {formatCurrency(selectedUser.pass.amountPaid)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      Slots Used: <strong className="text-slate-900">{selectedUser.pass.slotsUsed} / 2</strong>{" "}
                      {selectedUser.pass.slotsUsed < 2 && (
                        <span className="text-emerald-700 font-semibold">(Eligible to claim 1 more event for ₹0)</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
                    No active Festival Pass found for this participant.
                  </div>
                )}
              </div>

              {/* Registered Competitions */}
              <div className="space-y-3">
                <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] block">
                  Event Registrations ({selectedUser.registrations.length}/2)
                </span>

                {selectedUser.registrations.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                    {selectedUser.registrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-3.5 flex items-center justify-between gap-3 bg-white"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                              Slot #{reg.slotNumber}
                            </span>
                            {reg.event.isProEvent && (
                              <span className="rounded bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-black uppercase">
                                PRO
                              </span>
                            )}
                            <h4 className="font-bold text-slate-900 text-xs">
                              {reg.event.name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>{reg.event.eventDate ? formatDate(reg.event.eventDate) : ""}</span>
                            <span>•</span>
                            <span>{reg.event.venue}</span>
                          </div>
                        </div>

                        <div>
                          {reg.isAttended ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold">
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Attended</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>Pending Check-in</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 text-slate-400 italic text-center">
                    No event slots registered.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white text-xs hover:bg-primary transition-colors cursor-pointer"
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
