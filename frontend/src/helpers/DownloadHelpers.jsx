import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================
   KEYS TO SKIP
========================= */
const SKIP_KEYS = [
  "_id",
  "__v",
  "password",
  "profileImage",
  "faceDescriptor",
  "refreshToken",
];

/* =========================
   CLEAN DATA FUNCTION
========================= */
const cleanData = (data) =>
  data.map((row) => {
    const cleaned = {};

    Object.entries(row).forEach(([k, v]) => {
      if (SKIP_KEYS.includes(k)) return;

      if (v === null || v === undefined) {
        cleaned[k] = "";
        return;
      }

      if (typeof v === "boolean") {
        cleaned[k] = v ? "Active" : "Inactive";
        return;
      }

      if (Array.isArray(v)) {
        cleaned[k] = v.join(", ");
        return;
      }

      if (typeof v === "object") {
        cleaned[k] = v?.name || "";
        return;
      }

      cleaned[k] = v;
    });

    return cleaned;
  });

/* =========================
   HEADER FORMAT
========================= */
const toHeader = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toUpperCase();

/* =========================
   CSV DOWNLOAD
========================= */
export const downloadCSV = (data, filename = "data.csv") => {
  if (!data?.length) return;

  const cleaned = cleanData(data);
  const keys = Object.keys(cleaned[0]);

  const rows = [
    ["S.NO", ...keys.map(toHeader)].join(","),

    ...cleaned.map((row, i) =>
      [
        i + 1,
        ...keys.map((k) =>
          `"${String(row[k] ?? "").replace(/"/g, '""')}"`
        ),
      ].join(",")
    ),
  ];

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();
};

/* =========================
   EXCEL DOWNLOAD
========================= */
export const downloadExcel = (data, filename = "data.xlsx") => {
  if (!data?.length) return;

  const cleaned = cleanData(data);
  const keys = Object.keys(cleaned[0]);

  const formatted = cleaned.map((row, i) => {
    const out = { "S.NO": i + 1 };

    keys.forEach((k) => {
      out[toHeader(k)] = row[k];
    });

    return out;
  });

  const ws = XLSX.utils.json_to_sheet(formatted);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
};

/* =========================
   PDF DOWNLOAD (FIXED ✅)
========================= */
export const downloadPDF = (data, filename = "data.pdf") => {
  if (!data?.length) return;

  const cleaned = cleanData(data);
  const keys = Object.keys(cleaned[0]);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  autoTable(doc, {
    head: [["#", ...keys.map(toHeader)]],

    body: cleaned.map((row, i) => [
      i + 1,
      ...keys.map((k) => String(row[k] ?? "")),
    ]),

    startY: 10,

    margin: { left: 10, right: 10 },

    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
    },

    headStyles: {
      fillColor: [60, 60, 60],
      textColor: 255,
      fontStyle: "bold",
    },

    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },

    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
    },
  });

  doc.save(filename);
};

/* =========================
   TOGGLE SELECTION
========================= */
export const toggleSelection = (value, setter, selected) => {
  setter(
    selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
  );
};


// import * as XLSX from "xlsx";
// import { jsPDF } from "jspdf";
// import { applyPlugin } from "jspdf-autotable";

// applyPlugin(jsPDF);

// const SKIP_KEYS = ["_id", "__v", "password", "profileImage", "faceDescriptor", "refreshToken"];

// const cleanData = (data) =>
//   data.map((row) => {
//     const cleaned = {};
//     Object.entries(row).forEach(([k, v]) => {
//       if (SKIP_KEYS.includes(k)) return;
//       if (v === null || v === undefined) { cleaned[k] = ""; return; }
//       if (typeof v === "boolean") { cleaned[k] = v ? "Active" : "Inactive"; return; }
//       if (Array.isArray(v)) { cleaned[k] = v.join(", "); return; }
//       if (typeof v === "object") { cleaned[k] = v?.name || ""; return; }
//       cleaned[k] = v;
//     });
//     return cleaned;
//   });

// const toHeader = (key) =>
//   key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().toUpperCase();

// export const downloadCSV = (data, filename = "data.csv") => {
//   if (!data?.length) return;
//   const cleaned = cleanData(data);
//   const keys = Object.keys(cleaned[0]);
//   const rows = [
//     ["S.NO", ...keys.map(toHeader)].join(","),
//     ...cleaned.map((row, i) =>
//       [i + 1, ...keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`)]
//         .join(",")
//     ),
//   ];
//   const blob = new Blob([rows.join("\n")], { type: "text/csv" });
//   const link = document.createElement("a");
//   link.href = URL.createObjectURL(blob);
//   link.download = filename;
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
// };

// export const downloadExcel = (data, filename = "data.xlsx") => {
//   if (!data?.length) return;
//   const cleaned = cleanData(data);
//   const keys = Object.keys(cleaned[0]);
//   const formatted = cleaned.map((row, i) => {
//     const out = { "S.NO": i + 1 };
//     keys.forEach((k) => { out[toHeader(k)] = row[k]; });
//     return out;
//   });
//   const ws = XLSX.utils.json_to_sheet(formatted);
//   const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
//   XLSX.writeFile(wb, filename);
// };

// export const downloadPDF = (data, filename = "data.pdf") => {
//   if (!data?.length) return;
//   const cleaned = cleanData(data);
//   const keys = Object.keys(cleaned[0]);
//   const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
//   doc.autoTable({
//     head: [["#", ...keys.map(toHeader)]],
//     body: cleaned.map((row, i) => [i + 1, ...keys.map((k) => String(row[k] ?? ""))]),
//     startY: 10,
//     margin: { left: 10, right: 10 },
//     styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
//     headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold" },
//     alternateRowStyles: { fillColor: [245, 245, 245] },
//     columnStyles: { 0: { cellWidth: 10, halign: "center" } },
//   });
//   doc.save(filename);
// };

// export const toggleSelection = (value, setter, selected) => {
//   setter(selected.includes(value)
//     ? selected.filter((v) => v !== value)
//     : [...selected, value]
//   );
// };
