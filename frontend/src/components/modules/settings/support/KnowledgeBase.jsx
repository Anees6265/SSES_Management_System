/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckSquare,
  FiChevronDown,
  FiChevronUp,
  FiHelpCircle,
  FiMail,
  FiPhoneCall,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { FAQ_ITEMS } from "./supportConstants";

const PRE_CALL_CHECKLIST = [
  {
    title: "Note Exact Page & Action",
    detail: "Identify which module (e.g., Task Board, Student Promotion, Bulk Excel Upload) and button action triggered the issue.",
  },
  {
    title: "Copy Error Toast or Console Text",
    detail: "Paste any red error popup or exact API response message into the ticket description for faster debugging.",
  },
  {
    title: "Attach Full Screenshots",
    detail: "Capturing the full screen helps developers pinpoint the root cause quickly (Ctrl+V clipboard paste is supported).",
  },
  {
    title: "Specify Student, Batch, or File",
    detail: "If the issue relates to a specific student, subject, or Excel upload file, include their name or session code.",
  },
];

export default function KnowledgeBase({ onReportBug, onOpenDirectMail }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState(0);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(FAQ_ITEMS.map((item) => item.category)))],
    []
  );

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Searchable FAQ Accordion */}
      <div className="space-y-4 lg:col-span-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <FiBookOpen className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Portal Knowledge Base & FAQs
                </h3>
                <p className="text-xs text-slate-500">
                  Quick answers for common workflows, permissions, Excel uploads, and Task Board rules
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredFaqs.length} Articles
            </span>
          </div>

          {/* Search Input */}
          <div className="relative mt-4">
            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOpenIndex(0);
              }}
              placeholder="Search help topics (e.g. Excel order, Task Board, Continue Session, HOD)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-9 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/15"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear FAQ search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setOpenIndex(0);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-orange-500 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <FiHelpCircle className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              No matching FAQ articles found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your search keyword, or submit a bug report or send a direct email to the developers.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredFaqs.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={`${item.category}-${item.q}`}
                  className={`overflow-hidden rounded-2xl border transition ${
                    isOpen
                      ? "border-orange-200 bg-white shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                  >
                    <div className="space-y-1">
                      <span className="inline-block rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                        {item.category}
                      </span>
                      <p className="text-sm font-bold text-slate-900">{item.q}</p>
                    </div>
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      {isOpen ? (
                        <FiChevronUp className="h-4 w-4" />
                      ) : (
                        <FiChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 text-sm leading-relaxed text-slate-700">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Pre-Call Bug Checklist & Quick Escalation */}
      <div className="space-y-4 lg:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FiCheckSquare className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Pre-Call Bug Checklist
              </h4>
              <p className="text-xs text-slate-500">
                Review these details before calling or raising a ticket
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {PRE_CALL_CHECKLIST.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-[11px] font-bold text-white shadow-2xs">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-orange-700">
            <FiPhoneCall className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Still Need Developer Help?
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            Direct Engineering Escalation
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Didn&apos;t find your answer in the FAQs? Raise a bug ticket or send a direct email to Anees Khan and Himanshu Vishwakarma.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {onReportBug && (
              <button
                type="button"
                onClick={onReportBug}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-600 active:scale-[0.98] cursor-pointer"
              >
                <FiHelpCircle className="h-4 w-4" />
                Raise a Bug Ticket
              </button>
            )}
            {onOpenDirectMail && (
              <button
                type="button"
                onClick={() => onOpenDirectMail("both")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50/40"
              >
                <FiMail className="h-4 w-4 text-orange-600" />
                Email Both Developers
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
