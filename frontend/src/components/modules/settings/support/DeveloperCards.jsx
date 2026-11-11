/* eslint-disable react/prop-types */
import { useState } from "react";
import {
  MdPhone,
  MdEmail,
  MdContentCopy,
  MdCheck,
  MdBugReport,
  MdVerified,
  MdAccessTime,
  MdRocketLaunch,
  MdCode,
} from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa6";
import { toast } from "react-toastify";

const DeveloperCards = ({ developers = [], onOpenDirectMail, onReportToDeveloper }) => {
  const [copiedKey, setCopiedKey] = useState("");

  const handleCopy = async (key, value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`${label} copied: ${value}`);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? "" : prev));
      }, 1800);
    } catch {
      toast.info(`${label}: ${value}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {developers.map((dev) => {
        const isDeploymentLead = dev.id === "anees";

        return (
          <div
            key={dev.id}
            className="group bg-gradient-to-b from-white to-slate-50/30 border border-gray-200/90 hover:border-orange-300 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
          >
            {/* System Theme Gradient Accent Strip */}
            <div
              className={`h-1.5 w-full flex-shrink-0 ${
                isDeploymentLead
                  ? "bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500"
                  : "bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500"
              }`}
            />

            <div className="p-5 sm:p-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Identity Row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm border ${
                        isDeploymentLead
                          ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-400"
                          : "bg-gradient-to-br from-orange-50 to-amber-50 text-orange-600 border-orange-200"
                      }`}
                    >
                      {dev.initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-color)] truncate">
                          {dev.name}
                        </h3>
                        <MdVerified
                          size={17}
                          className="text-orange-500 shrink-0"
                          title="Verified Portal Lead Developer"
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">{dev.role}</p>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                          {isDeploymentLead ? (
                            <MdRocketLaunch size={11} />
                          ) : (
                            <MdCode size={12} />
                          )}
                          <span>{dev.badge}</span>
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                          </span>
                          Active Support
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs text-slate-600 leading-relaxed">{dev.bio}</p>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5">
                  {(dev.specialties || []).map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-50/90 text-slate-700 border border-slate-200/80 group-hover:border-orange-100 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Direct Contact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Mobile Box */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-orange-200 hover:bg-white transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                        <MdPhone size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Mobile / Call
                        </p>
                        <p className="text-xs font-extrabold text-slate-800 truncate">
                          {dev.displayMobile}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${dev.id}-mobile`, dev.mobile, `${dev.name}'s mobile`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer shrink-0"
                      title="Copy Mobile Number"
                    >
                      {copiedKey === `${dev.id}-mobile` ? (
                        <MdCheck size={15} className="text-emerald-600" />
                      ) : (
                        <MdContentCopy size={14} />
                      )}
                    </button>
                  </div>

                  {/* Email Box */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-orange-200 hover:bg-white transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                        <MdEmail size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Official Email
                        </p>
                        <p
                          className="text-xs font-extrabold text-slate-800 truncate"
                          title={dev.email}
                        >
                          {dev.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${dev.id}-email`, dev.email, `${dev.name}'s email`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer shrink-0"
                      title="Copy Email Address"
                    >
                      {copiedKey === `${dev.id}-email` ? (
                        <MdCheck size={15} className="text-emerald-600" />
                      ) : (
                        <MdContentCopy size={14} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Availability & SLA Bar */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 bg-orange-50/40 px-3 py-2 rounded-xl border border-orange-100/80 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <MdAccessTime size={14} className="text-orange-500" />
                    {dev.availability}
                  </span>
                  <span className="font-bold text-orange-700">{dev.responseSla}</span>
                </div>
              </div>

              {/* Direct Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3.5 border-t border-slate-100">
                <a
                  href={dev.telHref}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-orange-50 hover:border-orange-300 text-slate-800 hover:text-orange-700 text-xs font-bold transition-all active:scale-[0.97] shadow-2xs cursor-pointer"
                >
                  <MdPhone size={15} className="text-orange-500" />
                  <span>Call Now</span>
                </a>

                <button
                  type="button"
                  onClick={() => onOpenDirectMail(dev.id)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold transition-all active:scale-[0.97] shadow-xs hover:shadow-sm cursor-pointer"
                >
                  <MdEmail size={15} />
                  <span>Direct Mail</span>
                </button>

                <a
                  href={dev.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all active:scale-[0.97] cursor-pointer"
                >
                  <FaWhatsapp size={15} />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => onReportToDeveloper(dev.id)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 border border-gray-200 text-xs font-bold transition-all active:scale-[0.97] cursor-pointer"
                >
                  <MdBugReport size={15} className="text-rose-500" />
                  <span>Report Bug</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DeveloperCards;
