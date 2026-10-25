/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Pencil, Check, Trash2, Upload } from "lucide-react";

const getButtonIcon = (title, customIcon) => {
  if (customIcon) return customIcon;
  if (!title || typeof title !== "string") return null;
  const lower = title.toLowerCase();
  if (lower.includes("edit")) return <Pencil size={15} className="shrink-0" />;
  if (lower.includes("delete") || lower.includes("remove")) return <Trash2 size={15} className="shrink-0" />;
  if (lower.includes("upload")) return <Upload size={15} className="shrink-0" />;
  if (lower.includes("add") || lower.includes("create") || title.trim().startsWith("+")) return <Plus size={16} className="shrink-0" />;
  if (lower.includes("update") || lower.includes("save")) return <Check size={16} className="shrink-0" />;
  return null;
};

const getFooterRightIcon = (text) => {
  if (!text || typeof text !== "string") return <Check size={16} className="shrink-0" />;
  const lower = text.toLowerCase();
  if (lower.includes("add") || lower.includes("create")) return <Plus size={16} className="shrink-0" />;
  if (lower.includes("delete") || lower.includes("remove")) return <Trash2 size={16} className="shrink-0" />;
  if (lower.includes("upload")) return <Upload size={16} className="shrink-0" />;
  return <Check size={16} className="shrink-0" />;
};

const OrangeButton = ({
  buttonTitle,
  icon,
  drawerContent,
  children,
  panelTitle,
  panelSubtitle = "",
  customButtonClass,
  leftBtnText = "Cancel",
  rightBtnText = "Save",
  onLeftClick,
  onRightClick,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  showFooter = true,
  customFooter,
  maxWidth = "sm:max-w-xl",
  bodyClassName = "p-3.5 sm:p-6",
}) => {
  const isControlled = controlledIsOpen !== undefined;
  const [internalIsMounted, setInternalIsMounted] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [animatedIsOpen, setAnimatedIsOpen] = useState(false);

  const isOpen = isControlled ? animatedIsOpen : internalIsOpen;
  const isMounted = isControlled ? (controlledIsOpen || internalIsMounted) : internalIsMounted;

  useEffect(() => {
    if (isControlled) {
      if (controlledIsOpen) {
        setInternalIsMounted(true);
        const timer1 = setTimeout(() => {
          setAnimatedIsOpen(true);
        }, 50);
        const timer2 = setTimeout(() => {
          document.body.classList.add("drawer-open");
        }, 10);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } else {
        setAnimatedIsOpen(false);
        document.body.classList.remove("drawer-open");
        const timer = setTimeout(() => {
          setInternalIsMounted(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [controlledIsOpen, isControlled]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("drawer-open");
    };
  }, []);

  const openDrawer = () => {
    if (isControlled) return;
    setInternalIsMounted(true);
    setTimeout(() => {
      setInternalIsOpen(true);
      document.body.classList.add("drawer-open");
    }, 10);
  };

  const closeDrawer = () => {
    if (isControlled) {
      if (controlledOnClose) controlledOnClose();
    } else {
      setInternalIsOpen(false);
      document.body.classList.remove("drawer-open");
      setTimeout(() => setInternalIsMounted(false), 300);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        closeDrawer();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleLeftClick = () => {
    if (onLeftClick) onLeftClick();
    closeDrawer();
  };

  const detectedIcon = getButtonIcon(buttonTitle, icon);
  const cleanButtonTitle = typeof buttonTitle === "string" ? buttonTitle.replace(/^\+\s*/, "") : buttonTitle;

  return (
    <>
      {buttonTitle && !isControlled && (
        <button
          type="button"
          onClick={openDrawer}
          className={
            customButtonClass
              ? `${customButtonClass} inline-flex items-center justify-center gap-1.5 sm:gap-2`
              : "rounded-xl !bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold tracking-wider uppercase text-white transition-all duration-200 hover:shadow-md active:scale-[0.97] shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
          }
        >
          {detectedIcon}
          <span>{cleanButtonTitle}</span>
        </button>
      )}

      {isMounted &&
        createPortal(
          <div
            className="drawer-no-blur fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            onClick={closeDrawer}
          >
            {/* BACKDROP */}
            <div
              className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ${
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{ zIndex: 0 }}
            />

            {/* POPUP MODAL PANEL */}
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-full ${maxWidth || "sm:max-w-xl"} max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden z-10
              transform transition-all duration-200 ease-out
              ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none"}`}
            >
              {/* HEADER */}
              <div className="flex items-start justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-150 bg-slate-50/70 gap-3 shrink-0">
                <div className="min-w-0 flex-1">
                  {panelTitle && (
                    <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate sm:whitespace-normal leading-tight">{panelTitle}</h2>
                  )}
                  {panelSubtitle && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">{panelSubtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CONTENT */}
              <div className={`flex-1 overflow-y-auto custom-scrollbar ${bodyClassName}`}>
                {typeof drawerContent === "function" ? drawerContent({ closeDrawer }) : (drawerContent || children)}
              </div>

              {/* FOOTER */}
              {showFooter && (
                <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-gray-150 bg-white shrink-0">
                  {customFooter ? (
                    customFooter
                  ) : (
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                      {leftBtnText && (
                        <button
                          type="button"
                          onClick={handleLeftClick}
                          className="w-full sm:w-auto px-5 py-2 sm:py-2.5 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer inline-flex items-center justify-center text-center shrink-0"
                        >
                          <span>{leftBtnText}</span>
                        </button>
                      )}
                      {rightBtnText && (
                        <button
                          type="button"
                          onClick={onRightClick}
                          className="w-full sm:w-auto px-5 py-2 sm:py-2.5 rounded-xl !bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold tracking-wider uppercase text-xs sm:text-sm shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.97] cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 text-center shrink-0"
                        >
                          {getFooterRightIcon(rightBtnText)}
                          <span>{rightBtnText}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default OrangeButton;
