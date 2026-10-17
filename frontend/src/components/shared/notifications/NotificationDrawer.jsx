/* eslint-disable react/prop-types */
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, X, CheckCheck, Trash2, Info } from "lucide-react";
import { MdWarning, MdCheckCircle } from "react-icons/md";
import { confirmDelete } from "../modal/DeleteConfirmModal";

const NotificationDrawer = ({
  isOpen,
  onClose,
  notifications = [],
  onClearAll,
  onDismiss,
  title = "Notifications",
  subtitle = "Stay updated with important announcements & alerts",
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [animatedOpen, setAnimatedOpen] = useState(false);
  const [filterTab, setFilterTab] = useState("all");

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const timer = setTimeout(() => {
        setAnimatedOpen(true);
        document.body.classList.add("drawer-open");
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setAnimatedOpen(false);
      document.body.classList.remove("drawer-open");
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const warningCount = useMemo(
    () => notifications.filter((n) => n.type === "warning").length,
    [notifications]
  );
  const updatesCount = useMemo(
    () => notifications.filter((n) => n.type === "info" || n.type === "success" || !n.type).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (filterTab === "warning") return notifications.filter((n) => n.type === "warning");
    if (filterTab === "updates") return notifications.filter((n) => n.type === "info" || n.type === "success" || !n.type);
    return notifications;
  }, [notifications, filterTab]);

  if (!isMounted) return null;

  return createPortal(
    <div className="drawer-no-blur fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          animatedOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar Shutter Panel */}
      <div
        className={`relative w-full sm:max-w-md md:max-w-lg h-full bg-white shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-in-out ${
          animatedOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header matching Website Theme */}
        <div className="flex items-start justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-slate-50/70 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate">
                  {title}
                </h2>
                {notifications.length > 0 && (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200/80 shrink-0">
                    {notifications.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {notifications.length > 0 && onClearAll && (
              <button
                type="button"
                onClick={async () => {
                  if (
                    await confirmDelete({
                      title: "Clear Notifications",
                      message: "Are you sure you want to permanently clear all notifications?",
                      itemName: `${notifications.length} Notification(s)`,
                      confirmText: "Clear All",
                    })
                  ) {
                    onClearAll();
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl border border-rose-200/80 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="font-bold">Clear All</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Category Filters Bar */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === "all"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {notifications.length}
              </span>
            </button>
            {warningCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab("warning")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === "warning"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-amber-50 hover:text-amber-700 border border-gray-200/80"
                }`}
              >
                <span>Alerts</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filterTab === "warning" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {warningCount}
                </span>
              </button>
            )}
            {updatesCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab("updates")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterTab === "updates"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200/80"
                }`}
              >
                <span>Updates</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filterTab === "updates" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {updatesCount}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar bg-slate-50/40">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const isWarning = notif.type === "warning";
              const isSuccess = notif.type === "success";

              const borderAccent = isWarning
                ? "border-l-4 border-l-amber-500 hover:border-amber-400"
                : isSuccess
                ? "border-l-4 border-l-emerald-500 hover:border-emerald-400"
                : "border-l-4 border-l-orange-500 hover:border-orange-400";

              const iconContainer = isWarning
                ? "bg-amber-50 text-amber-600 border border-amber-200/70"
                : isSuccess
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200/70"
                : "bg-orange-50 text-orange-600 border border-orange-200/70";

              const badgeStyle = isWarning
                ? "bg-amber-50 text-amber-700 border border-amber-200/70"
                : isSuccess
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                : "bg-orange-50 text-orange-700 border border-orange-200/70";

              return (
                <div
                  key={notif.id}
                  className={`bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-2.5 group relative ${borderAccent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${iconContainer}`}>
                        {notif.icon || (
                          isWarning ? (
                            <MdWarning size={17} />
                          ) : isSuccess ? (
                            <MdCheckCircle size={17} />
                          ) : (
                            <Info className="w-4 h-4 text-orange-600" />
                          )
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                          {notif.title}
                        </h4>
                        {notif.time && (
                          <div className="mt-1">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${badgeStyle}`}>
                              {notif.time}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {onDismiss && (
                      <button
                        type="button"
                        onClick={() => onDismiss(notif.id)}
                        className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 font-medium leading-relaxed pl-10.5">
                    {notif.message}
                  </p>
                </div>
              );
            })
          ) : (
            /* EMPTY STATE */
            <div className="h-full flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-2xs mb-4">
                <BellOff size={28} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">No Notifications</h3>
              <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                You&apos;re all caught up! There are no pending alerts or announcements right now.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] font-semibold text-gray-600 shadow-2xs">
                <CheckCheck size={14} className="text-emerald-500" />
                <span>Everything is up to date</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer matching Website Theme */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${notifications.length > 0 ? "bg-orange-500 animate-pulse" : "bg-emerald-500"}`} />
            <p className="text-xs font-semibold text-gray-500">
              {notifications.length > 0
                ? `${notifications.length} active alert${notifications.length > 1 ? "s" : ""}`
                : "Zero pending alerts"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl !bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold tracking-wider uppercase text-xs shadow-xs hover:shadow-md transition-all active:scale-[0.97] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationDrawer;
