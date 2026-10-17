/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, X, CheckCheck, Trash2, Info } from "lucide-react";
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

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          animatedOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar Shutter Panel */}
      <div
        className={`relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-in-out ${
          animatedOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{title}</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {notifications.length}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {notifications.length > 0 && onClearAll && (
              <button
                type="button"
                onClick={async () => {
                  if (await confirmDelete({
                    title: "Clear Notifications",
                    message: "Are you sure you want to permanently clear all notifications?",
                    itemName: `${notifications.length} Notification(s)`,
                    confirmText: "Clear All"
                  })) {
                    onClearAll();
                  }
                }}
                className="text-xs font-semibold text-gray-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer flex items-center gap-1"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              title="Close notification drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs hover:border-orange-300 transition-all space-y-2 group relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        notif.type === "success"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : notif.type === "warning"
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-orange-50 text-orange-600 border border-orange-100"
                      }`}
                    >
                      {notif.icon || <Info className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                        {notif.title}
                      </h4>
                      {notif.time && (
                        <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                          {notif.time}
                        </p>
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

                <p className="text-xs text-gray-600 leading-relaxed pl-10.5">
                  {notif.message}
                </p>
              </div>
            ))
          ) : (
            /* EMPTY STATE */
            <div className="h-full flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-400 shadow-2xs mb-4">
                <BellOff size={28} />
              </div>
              <h3 className="text-sm font-extrabold text-gray-900">No Notifications</h3>
              <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                You&apos;re all caught up! There are no new notifications or announcements at the moment.
              </p>
              <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-[11px] font-semibold text-gray-500 shadow-2xs">
                <CheckCheck size={14} className="text-emerald-500" />
                <span>Everything is up to date</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 bg-white flex items-center justify-between">
          <p className="text-[11px] font-medium text-gray-400">
            {notifications.length > 0
              ? `${notifications.length} active notification${notifications.length > 1 ? "s" : ""}`
              : "Zero pending notifications"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer"
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
