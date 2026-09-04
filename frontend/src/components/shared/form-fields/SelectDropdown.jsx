/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { MdExpandMore, MdCheck } from "react-icons/md";

const SelectDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasWidth = className.split(" ").some((c) => c.startsWith("w-"));
  const widthClass = hasWidth ? "" : "w-full";

  return (
    <div ref={dropdownRef} className={`relative inline-block ${widthClass} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={buttonClassName || `w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm border border-gray-200 hover:border-[var(--primary,#FDA92D)] bg-white rounded-xl text-gray-800 font-medium transition-all shadow-xs focus:outline-none ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <MdExpandMore
          size={18}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[var(--primary,#FDA92D)]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 min-w-full w-max max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn custom-scrollbar">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={String(opt.value)}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3.5 py-2 text-sm font-medium cursor-pointer transition-colors duration-150 ${
                  isSelected
                    ? "bg-[var(--primary,#FDA92D)] text-white"
                    : "text-gray-700 hover:bg-[var(--primary,#FDA92D)] hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <MdCheck size={16} className="ml-2 shrink-0 text-white" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SelectDropdown;
