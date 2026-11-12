/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import {
  campusBuildingBg,
  collegeLogo,
  formatPlacementPosterData,
  profileDummy,
} from "./placementPosterUtils";

/**
 * On-screen visual Placement Poster matching the official SSISM / Department template:
 * Left top: College Logo | Right top: Dynamic Department Logo
 */
const PlacementPosterCard = ({
  student,
  companyMap = {},
  size = "card", // 'card' | 'preview'
  className = "",
}) => {
  const poster = formatPlacementPosterData(student, companyMap);
  const [studentImgErr, setStudentImgErr] = useState(false);
  const [companyImgErr, setCompanyImgErr] = useState(false);

  useEffect(() => {
    setStudentImgErr(false);
    setCompanyImgErr(false);
  }, [student?._id, student?.image, poster.companyLogo]);

  const isPreview = size === "preview";

  return (
    <div
      className={`aspect-square w-full relative overflow-hidden bg-white select-none flex flex-col justify-between ${className}`}
    >
      {/* Decorative soft slate-blue arcs (top-left & mid-right) */}
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="14"
          r="98"
          fill="none"
          stroke="#EEF2F8"
          strokeWidth="44"
        />
        <circle
          cx="374"
          cy="218"
          r="76"
          fill="none"
          stroke="#EEF2F8"
          strokeWidth="30"
        />
      </svg>

      {/* Bottom rounded campus building background (soft washed-out fade) */}
      <div className="absolute left-[4.5%] right-[4.5%] bottom-[8px] h-[38%] rounded-t-[26px] overflow-hidden pointer-events-none">
        <img
          src={campusBuildingBg}
          alt=""
          className="w-full h-full object-cover object-center opacity-[0.23]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/35 to-white/10" />
      </div>

      {/* Main Content Stack */}
      <div className="relative z-10 flex flex-col flex-1 px-[5%] pt-[4%] pb-[14px]">
        {/* Top Row: Left College Logo & Right Dynamic Department Logo */}
        <div className="flex items-start justify-between gap-2 shrink-0">
          <img
            src={collegeLogo}
            alt="SSISM Sant Singaji Educational Society"
            className={`${
              isPreview ? "h-11 sm:h-12" : "h-8 sm:h-9"
            } max-w-[48%] object-contain object-left`}
          />
          <img
            src={poster.department.logo}
            alt={`${poster.department.label} Logo`}
            className={`${
              poster.department.isSquareLogo
                ? isPreview
                  ? "h-12 sm:h-14"
                  : "h-9 sm:h-10"
                : isPreview
                ? "h-11 sm:h-12"
                : "h-8 sm:h-9"
            } max-w-[40%] object-contain object-right`}
          />
        </div>

        {/* Heading & Announcement */}
        <div className="text-center mt-[2.5%] shrink-0">
          <h3
            className={`${
              isPreview ? "text-[30px] sm:text-[34px]" : "text-[21px] sm:text-[23px]"
            } font-extrabold tracking-tight leading-tight`}
            style={{ color: "#1E4488" }}
          >
            Congratulations
          </h3>
          <p
            className={`${
              isPreview ? "text-[14px] sm:text-[15.5px]" : "text-[10.5px] sm:text-[11px]"
            } text-slate-800 font-medium leading-[1.3] mt-[1%]`}
          >
            We are proud to announce that
            <br />
            our {poster.department.label} student
          </p>
        </div>

        {/* Center Photo + 3D Notched Orange Ribbon */}
        <div className="flex flex-col items-center mt-[2.5%] shrink-0">
          <div
            className={`w-[30%] aspect-square rounded-full ${
              isPreview ? "border-[5px]" : "border-[3.5px]"
            } border-[#F26522] bg-white overflow-hidden shadow-xs relative z-10`}
          >
            <img
              src={studentImgErr ? profileDummy : poster.studentImage}
              alt={poster.fullName}
              onError={() => setStudentImgErr(true)}
              className="w-full h-full object-cover object-top"
              loading="lazy"
            />
          </div>

          {/* Notched Ribbon Banner */}
          <div className="relative z-20 -mt-[5.2%] w-[64%] flex items-center justify-center">
            <svg
              viewBox="0 0 260 56"
              className="w-full h-auto block drop-shadow-xs"
              aria-hidden="true"
            >
              {/* Left & right swallowtail wings */}
              <polygon points="0,12 36,12 36,52 0,52 14,32" fill="#F26522" />
              <polygon points="260,12 224,12 224,52 260,52 246,32" fill="#F26522" />
              {/* Fold shadows behind main banner */}
              <polygon points="22,42 36,42 36,52" fill="#B9430C" />
              <polygon points="238,42 224,42 224,52" fill="#B9430C" />
              {/* Center front rectangle */}
              <rect x="22" y="2" width="216" height="40" fill="#F26522" />
            </svg>

            <div className="absolute inset-x-[10%] top-[4%] bottom-[25%] flex flex-col items-center justify-center text-center px-1">
              <p
                className={`${
                  isPreview ? "text-[16px] sm:text-[18px]" : "text-[11px] sm:text-[12px]"
                } font-extrabold text-white leading-tight truncate w-full`}
              >
                {poster.fullName}
              </p>
              {poster.courseYearLabel && (
                <p
                  className={`${
                    isPreview ? "text-[10.5px] sm:text-[11.5px]" : "text-[7.5px] sm:text-[8px]"
                  } font-medium text-orange-50 leading-tight truncate w-full mt-0.5`}
                >
                  {poster.courseYearLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lower Details: Parent, Village, Divider, Job Profile, Company Row */}
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-[1%] min-h-0">
          {poster.fatherDisplay && (
            <p
              className={`${
                isPreview ? "text-[13.5px] sm:text-[14.5px]" : "text-[9.5px] sm:text-[10px]"
              } text-slate-800 leading-tight truncate max-w-full`}
            >
              {poster.relationPrefix}{" "}
              <span className="font-extrabold text-slate-900">{poster.fatherDisplay}</span>
            </p>
          )}

          {poster.locationPlace && (
            <p
              className={`${
                isPreview ? "text-[13px] sm:text-[14px]" : "text-[9px] sm:text-[9.5px]"
              } text-slate-800 leading-tight mt-0.5 truncate max-w-full`}
            >
              from{" "}
              <span className="font-bold text-slate-900">{poster.locationPlace}</span>
            </p>
          )}

          <div className="w-[58%] h-[1px] bg-slate-500/70 my-[2.2%]" />

          <p
            className={`${
              isPreview ? "text-[14px] sm:text-[15.5px]" : "text-[9.5px] sm:text-[10.5px]"
            } text-slate-800 leading-tight px-2`}
          >
            has been placed as a{" "}
            <span className="font-extrabold text-slate-950">{poster.jobProfile}</span> at
          </p>

          {/* Company Logo Card + Bold Navy Name & Location */}
          <div className="mt-[2.5%] flex items-center justify-center gap-2 sm:gap-2.5 max-w-full px-1">
            {poster.companyLogo && !companyImgErr ? (
              <div
                className={`bg-white rounded-md shadow-xs border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden ${
                  isPreview ? "h-8 sm:h-9 px-2 py-1 max-w-[105px]" : "h-6 px-1.5 py-0.5 max-w-[74px]"
                }`}
              >
                <img
                  src={poster.companyLogo}
                  alt={poster.companyName}
                  onError={() => setCompanyImgErr(true)}
                  className="max-h-full w-auto object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div
                className={`rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-center font-black shrink-0 ${
                  isPreview ? "w-8 h-8 text-sm" : "w-6 h-6 text-[10px]"
                }`}
                style={{ color: "#1E4488" }}
              >
                {poster.companyName?.charAt(0)?.toUpperCase() || "C"}
              </div>
            )}

            <p
              className={`${
                isPreview ? "text-[15px] sm:text-[17px]" : "text-[10.5px] sm:text-[11.5px]"
              } font-extrabold leading-tight truncate`}
              style={{ color: "#1E4488" }}
              title={poster.companyHeadline}
            >
              {poster.companyHeadline}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Two-Tone Orange Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 flex z-20 ${
          isPreview ? "h-[11px]" : "h-[7px]"
        }`}
      >
        <div className="w-[58%] h-full bg-[#F68B1F]" />
        <div className="w-[42%] h-full bg-[#EE4B22]" />
      </div>
    </div>
  );
};

export default PlacementPosterCard;

