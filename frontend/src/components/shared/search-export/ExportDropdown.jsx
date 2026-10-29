/* eslint-disable react/prop-types */
import { toast } from "react-toastify";
import TableDownloadDropdown from "../table/TableDownloadDropdown";
import { downloadExcel, downloadPDF } from "../../../helpers/DownloadHelpers";
import {
  exportStudentsToExcel,
  exportStudentsToPDF,
} from "../../../utils/studentExportHelpers";

const ExportDropdown = ({
  data = [],
  selectedRows = [],
  sectionName = "data",
  fileName,
  className = "",
  size = "md",
  align = "right",
}) => {
  const selectedSet = new Set(selectedRows);
  const dataToExport =
    selectedRows.length > 0
      ? data.filter((row) => selectedSet.has(row._id || row.id || row.stdId))
      : data;

  const finalFileName = fileName || `${sectionName}_${new Date().toISOString().slice(0, 10)}`;

  const handleDownloadExcel = () => {
    if (!dataToExport || dataToExport.length === 0) {
      toast.warn("No data available to export");
      return;
    }

    // If records contain raw student data, use rich student exporter
    const hasRawStudent = dataToExport.some((d) => d && (d.raw || d.studentMobile || d.prkey));
    if (hasRawStudent) {
      const studentList = dataToExport.map((d) => d.raw || d);
      exportStudentsToExcel(studentList, { filename: `${finalFileName}.xlsx` });
    } else {
      downloadExcel(dataToExport, `${finalFileName}.xlsx`);
    }
  };

  const handleDownloadPDF = () => {
    if (!dataToExport || dataToExport.length === 0) {
      toast.warn("No data available to export");
      return;
    }

    const hasRawStudent = dataToExport.some((d) => d && (d.raw || d.studentMobile || d.prkey));
    if (hasRawStudent) {
      const studentList = dataToExport.map((d) => d.raw || d);
      exportStudentsToPDF(studentList, {
        title: `${sectionName.toUpperCase()} REPORT`,
        filename: `${finalFileName}.pdf`,
      });
    } else {
      downloadPDF(dataToExport, `${finalFileName}.pdf`);
    }
  };

  return (
    <TableDownloadDropdown
      count={selectedRows.length}
      total={data.length}
      onDownloadExcel={handleDownloadExcel}
      onDownloadPDF={handleDownloadPDF}
      className={className}
      size={size}
      align={align}
      disabled={!data || data.length === 0}
    />
  );
};

export default ExportDropdown;
