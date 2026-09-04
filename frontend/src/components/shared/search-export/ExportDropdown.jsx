/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from "react";
import { BsFillCloudDownloadFill } from "react-icons/bs";
import {
  downloadCSV,
  downloadExcel,
  downloadPDF,
} from "../../../helpers/DownloadHelpers";

const ExportDropdown = ({
  data = [],
  selectedRows = [],
  sectionName = "data",
  fileName,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (!ref.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // 👇 Agar rows select kiye hai to sirf wahi export honge
  const dataToExport =
    selectedRows.length > 0
      ? data.filter((row) => selectedRows.includes(row._id))
      : data;

  const finalFileName = fileName || `${sectionName}-${Date.now()}`;

  const handleDownload = (type) => {
    if (!dataToExport.length) {
      alert("No data available to export");
      return;
    }

    if (type === "csv")
      downloadCSV(dataToExport, `${finalFileName}.csv`);

    if (type === "excel")
      downloadExcel(dataToExport, `${finalFileName}.xlsx`);

    if (type === "pdf")
      downloadPDF(dataToExport, `${finalFileName}.pdf`);

    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 h-10 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-700 shadow-sm"
      >
        <BsFillCloudDownloadFill size={14} />
        <span className="hidden sm:inline">Export</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-40
                        bg-white border rounded-lg shadow-lg z-50">
          <button
            className="w-full px-4 py-2 text-left text-sm
                       hover:bg-gray-100"
            onClick={() => handleDownload("csv")}
          >
            Export as CSV
          </button>

          <button
            className="w-full px-4 py-2 text-left text-sm
                       hover:bg-gray-100"
            onClick={() => handleDownload("excel")}
          >
            Export as Excel
          </button>

          <button
            className="w-full px-4 py-2 text-left text-sm
                       hover:bg-gray-100"
            onClick={() => handleDownload("pdf")}
          >
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;


// /* eslint-disable react/prop-types */
// import { useState, useRef, useEffect } from "react";
// import { BsFillCloudDownloadFill } from "react-icons/bs";
// import {
//   downloadCSV,
//   downloadExcel,
//   downloadPDF,
// } from "../../../helpers/DownloadHelpers";

// const ExportDropdown = ({
//   data = [],
//   selectedRows = [],
//   sectionName = "data",
// }) => {
//   const [open, setOpen] = useState(false);
//   const ref = useRef(null);

//   useEffect(() => {
//     const close = (e) => {
//       if (!ref.current?.contains(e.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", close);
//     return () => document.removeEventListener("mousedown", close);
//   }, []);

//   const dataToExport =
//     selectedRows.length > 0
//       ? data.filter((row) => selectedRows.includes(row._id))
//       : data;

//   return (
//     <div className="relative" ref={ref}>
//       <button
//         onClick={() => setOpen(!open)}
//         className="flex items-center gap-1 text-gray-600 hover:text-black"
//       >
//         <BsFillCloudDownloadFill />
//         Export
//       </button>

//       {open && (
//         <div className="absolute top-10 left-0 bg-white border rounded-lg shadow w-40 z-50">
//           <button
//             className="block w-full px-4 py-2 text-left hover:bg-gray-100"
//             onClick={() => downloadCSV(dataToExport, `${sectionName}.csv`)}
//           >
//             CSV
//           </button>

//           <button
//             className="block w-full px-4 py-2 text-left hover:bg-gray-100"
//             onClick={() => downloadExcel(dataToExport, `${sectionName}.xlsx`)}
//           >
//             Excel
//           </button>

//           <button
//             className="block w-full px-4 py-2 text-left hover:bg-gray-100"
//             onClick={() => downloadPDF(dataToExport, `${sectionName}.pdf`)}
//           >
//             PDF
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ExportDropdown;
