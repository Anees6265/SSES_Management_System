/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

const SearchBox = ({ searchTerm = "", setSearchTerm = () => {} }) => {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        if (!searchTerm) setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm]);

  const handleClear = () => {
    setSearchTerm("");
    setExpanded(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center">

      {/* Mobile: icon only, expands on click */}
      <div className={`sm:hidden flex items-center transition-all duration-300 ${
        expanded ? "w-48 border border-orange-500 ring-2 ring-orange-500/20 rounded-lg bg-white" : "w-9"
      } h-9 overflow-hidden`}>
        {expanded ? (
          <div className="flex items-center w-full px-2 gap-1">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-sm outline-none border-none bg-transparent min-w-0"
            />
            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            <Search size={16} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Desktop: always visible full input */}
      <div className="hidden sm:flex items-center border border-gray-300 rounded-lg h-10 w-56 md:w-72 bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-colors px-3 gap-2">
        <Search size={15} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 text-sm outline-none border-none bg-transparent"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

    </div>
  );
};

export default SearchBox;
