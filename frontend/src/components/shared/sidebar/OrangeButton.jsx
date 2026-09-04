/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const OrangeButton = ({
  buttonTitle,
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
  maxWidth = "sm:max-w-md",
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

  const handleLeftClick = () => {
    if (onLeftClick) onLeftClick();
    closeDrawer();
  };

  return (
    <>
      {buttonTitle && !isControlled && (
        <button
          type="button"
          onClick={openDrawer}
          className={
            customButtonClass ||
            "rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-orange-600 hover:shadow-md hover:scale-[1.03] active:scale-[0.97]"
          }
        >
          {buttonTitle}
        </button>
      )}

      {isMounted &&
        createPortal(
          <div className="drawer-no-blur fixed inset-0 z-[60] flex justify-end">
            {/* BACKDROP */}
            <div
              onClick={closeDrawer}
              className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{ zIndex: 0 }}
            />

            {/* PANEL */}
            <div
              className={`relative w-full ${maxWidth} h-full bg-white shadow-xl flex flex-col
              transform transition-transform duration-300 ease-in-out z-10
              ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
              {/* HEADER */}
              <div className="flex items-start justify-between px-6 py-5 border-b bg-gray-50/50">
                <div>
                  {panelTitle && (
                    <h2 className="text-xl font-semibold text-gray-900">{panelTitle}</h2>
                  )}
                  {panelSubtitle && (
                    <p className="text-sm text-gray-500 mt-1">{panelSubtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto p-6">
                {drawerContent || children}
              </div>

              {/* FOOTER */}
              {showFooter && (
                <div className="px-6 py-4 border-t bg-white">
                  {customFooter ? (
                    customFooter
                  ) : (
                    <div className="flex gap-4">
                      {leftBtnText && (
                        <button
                          type="button"
                          onClick={handleLeftClick}
                          className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                        >
                          {leftBtnText}
                        </button>
                      )}
                      {rightBtnText && (
                        <button
                          type="button"
                          onClick={onRightClick}
                          className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {rightBtnText}
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
