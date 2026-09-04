/* eslint-disable react/prop-types */
import { useRef, useState, useEffect } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";

const TabsCommon = ({ tabs, activeTab, onTabChange }) => {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 0);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [tabs]);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 150, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center w-full bg-white">
      {showLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 z-10 h-full px-1 bg-white shadow-md text-gray-500 hover:text-orange-500"
        >
          <MdChevronLeft size={22} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-6 px-6 overflow-x-auto scrollbar-none min-w-0 w-full"
      >
        {tabs.map((tab) => (
          <p
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-4 cursor-pointer text-md text-[var(--text-color)] whitespace-nowrap ${
              activeTab === tab
                ? "border-orange-500 text-orange-600 border-b-4 font-semibold"
                : "border-transparent"
            }`}
          >
            {tab}
          </p>
        ))}
      </div>

      {showRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 z-10 h-full px-1 bg-white shadow-md text-gray-500 hover:text-orange-500"
        >
          <MdChevronRight size={22} />
        </button>
      )}
    </div>
  );
};

export default TabsCommon;
