"use client";

import { useState } from "react";
import { LogOut, AlertTriangle, Loader2, X } from "lucide-react";
import { signOutUser } from "@/actions/auth";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "danger" | "ghost";
  className?: string;
  showIcon?: boolean;
  label?: string;
  onLogoutSuccess?: () => void;
}

export function LogoutButton({
  variant = "outline",
  className = "",
  showIcon = true,
  label = "Log Out",
  onLogoutSuccess,
}: LogoutButtonProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOutUser();
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case "danger":
        return "bg-rose-600 text-white hover:bg-rose-700 shadow-xs";
      case "ghost":
        return "text-rose-600 hover:bg-rose-50 hover:text-rose-700";
      case "default":
        return "bg-slate-900 text-white hover:bg-slate-800 shadow-xs";
      case "outline":
      default:
        return "border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 hover:border-rose-300 shadow-2xs";
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setShowConfirmModal(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${getButtonStyles()} ${className}`}
        title="Sign out of your account"
      >
        {showIcon && <LogOut className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </button>

      {/* Confirmation Popup Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-auto">
            {/* Close Button */}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => setShowConfirmModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Body */}
            <div className="flex flex-col items-center text-center space-y-3 pt-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-8 ring-rose-50">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold font-display text-slate-900">
                  Confirm Sign Out
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Are you sure you want to log out of your session? You will need to sign back in to access your digital pass and event allocations.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowConfirmModal(false)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
