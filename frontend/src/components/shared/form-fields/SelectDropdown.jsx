/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MdExpandMore, MdCheck } from "react-icons/md";

const SelectDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  disabled = false,
  align = "left",
  direction = "auto", // "auto" | "down" | "up"
  usePortal = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(direction === "up");
  const [portalStyle, setPortalStyle] = useState({});
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const normalizedValue = value === undefined || value === null ? "" : String(value);
  const selectedOption = options.find((opt) => {
    const optVal = opt.value === undefined || opt.value === null ? "" : String(opt.value);
    return optVal === normalizedValue;
  });
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    if (direction === "up") {
      setOpenUpwards(true);
    } else if (direction === "down") {
      setOpenUpwards(false);
    }
  }, [direction]);

  const updatePosition = () => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = direction === "up" || (direction !== "down" && spaceBelow < 260 && spaceAbove > spaceBelow);
    setOpenUpwards(openUp);

    if (usePortal) {
      const menuMaxHeight = Math.min(240, Math.max(120, (openUp ? spaceAbove : spaceBelow) - 16));
      let left = align === "right" ? rect.right - rect.width : rect.left;
      let minWidth = rect.width;

      if (left < 8) left = 8;
      if (left + minWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - minWidth - 8);
      }

      setPortalStyle({
        position: "fixed",
        left: `${left}px`,
        minWidth: `${minWidth}px`,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: `${menuMaxHeight}px`,
        zIndex: 99999,
        ...(openUp
          ? {
              top: `${rect.top - 6}px`,
              transform: "translateY(-100%)",
            }
          : {
              top: `${rect.bottom + 6}px`,
            }),
      });
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inDropdown && !inMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = (e) => {
      if (e && e.target && menuRef.current && menuRef.current.contains(e.target)) {
        return;
      }
      if (usePortal) {
        setIsOpen(false);
      } else {
        updatePosition();
      }
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, usePortal, direction, align]);

  const hasWidth = className.split(" ").some((c) => c.startsWith("w-"));
  const widthClass = hasWidth ? "" : "w-full";

  const menuElement = (
    <div
      ref={menuRef}
      style={usePortal ? portalStyle : undefined}
      className={`${
        usePortal
          ? "overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 animate-fadeIn custom-scrollbar"
          : `absolute ${align === "right" ? "right-0" : "left-0"} ${
              openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } min-w-full max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn custom-scrollbar`
      } ${menuClassName || (usePortal ? "w-max" : "w-max max-w-[calc(100vw-2rem)]")}`}
    >
      {options.length === 0 ? (
        <div className="px-3.5 py-2 text-xs text-gray-400 italic">No options available</div>
      ) : (
        options.map((opt, idx) => {
          const isSelected =
            (opt.value === undefined || opt.value === null ? "" : String(opt.value)) === normalizedValue;
          return (
            <div
              key={`${String(opt.value)}-${idx}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-3.5 py-2 text-sm font-medium cursor-pointer transition-colors duration-150 ${
                isSelected
                  ? "bg-[var(--primary,#F97316)] text-white"
                  : "text-gray-700 hover:bg-[var(--primary,#F97316)] hover:text-white"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && <MdCheck size={16} className="ml-2 shrink-0 text-white" />}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div ref={dropdownRef} className={`relative inline-block ${widthClass} ${className} ${isOpen && !usePortal ? "z-40" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={`${buttonClassName || `w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm border border-gray-200 hover:border-[var(--primary,#F97316)] bg-white rounded-xl text-gray-800 font-medium transition-all shadow-xs focus:outline-none ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`} ${isOpen ? "!border-[var(--primary,#F97316)] ring-2 ring-[var(--primary,#F97316)]/20 !bg-white" : ""}`}
      >
        <span className="truncate">{displayLabel}</span>
        <MdExpandMore
          size={18}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--primary,#F97316)]" : ""
          }`}
        />
      </button>

      {isOpen && (usePortal ? createPortal(menuElement, document.body) : menuElement)}
    </div>
  );
};

export default SelectDropdown;
