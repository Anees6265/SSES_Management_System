/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { useField } from "formik";
import { ChevronDown } from "lucide-react";

const CustomDropdown = ({
  label,
  name,
  options = [],
  disabled = false,
  variant = "inline", // 🔥 inline | card
  className = "",
}) => {
  const [field, , helpers] = useField(name);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(
    (opt) => opt.value === field.value
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value) => {
    helpers.setValue(value);
    setOpen(false);
  };

  // 🎨 Design Variants
  const variants = {
    inline: {
      wrapper: "flex items-center gap-3",
      label: "text-base font-medium text-gray-600",
      button:
        "bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-base px-5 py-2.5 rounded-2xl",
    },
    card: {
      wrapper: "flex flex-col gap-2 w-full",
      label: "text-xs font-semibold text-gray-400 uppercase tracking-wider",
      button:
        "border-2 border-gray-300 bg-gray-50 text-base px-4 py-3 rounded-xl",
    },
  };

  const current = variants[variant];

  return (
    <div className={`${current.wrapper} ${className}`}>

      {/* Label */}
      {label && (
        <span className={current.label}>{label}</span>
      )}

      {/* Dropdown */}
      <div ref={dropdownRef} className="relative w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={`
            w-full flex items-center justify-between
            transition-all
            focus:outline-none
            ${current.button}
            ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <span>
            {selectedOption ? selectedOption.label : "Select"}
          </span>

          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <ul className="absolute mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto z-50">
            {options.map((opt) => (
              <li
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`
                  px-4 py-2 text-sm cursor-pointer transition
                  ${
                    field.value === opt.value
                      ? "bg-[var(--primary,#FDA92D)] text-white font-semibold"
                      : "hover:bg-[var(--primary,#FDA92D)] hover:text-white"
                  }
                `}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CustomDropdown;