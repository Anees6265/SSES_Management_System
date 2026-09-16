import { useState } from "react";
import { MdAdd, MdFilterList } from "react-icons/md";
import { useParams, useLocation } from "react-router-dom";
import Header from "../../../shared/sidebar/Header";
import CommonTable from "../../../shared/table/CommonTable";
import SearchBox from "../../../shared/search-export/SearchBox";
import ExportDropdown from "../../../shared/search-export/ExportDropdown";
import SyllabusTab, { TasksTab } from "./SyllabusTab";

const SECTION_TABS = ["Students", "Tasks", "Syllabus", "Progress"];

const DUMMY_STUDENTS = [
  { _id: "1", name: "John Doe", fatherName: "Robert Doe", mobile: "+91 9876543210", course: "BCA", busRoute: "Route A", attempts: 1 },
  { _id: "2", name: "Jane Smith", fatherName: "Michael Smith", mobile: "+91 9123456780", course: "MCA", busRoute: "Route B", attempts: 2 },
  { _id: "3", name: "Aryan Gupta", fatherName: "Suresh Gupta", mobile: "+91 9988776655", course: "BCA", busRoute: "Route C", attempts: 3 },
  { _id: "4", name: "Priya Sharma", fatherName: "Ramesh Sharma", mobile: "+91 9871234560", course: "BSc", busRoute: "Route A", attempts: 1 },
  { _id: "5", name: "Rahul Verma", fatherName: "Anil Verma", mobile: "+91 9765432100", course: "MCA", busRoute: "Route D", attempts: 2 },
];

const TABLE_COLUMNS = [
  {
    key: "name", label: "Full Name",
    render: (row) => {
      const initials = row.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
          <span className="font-semibold text-gray-800 text-sm">{row.name}</span>
        </div>
      );
    },
  },
  { key: "fatherName", label: "Father's Name", render: (row) => <span className="text-sm text-gray-600">{row.fatherName}</span> },
  { key: "mobile", label: "Mobile No.", render: (row) => <span className="text-sm text-gray-600">{row.mobile}</span> },
  { key: "course", label: "Course", render: (row) => <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{row.course}</span> },
  { key: "busRoute", label: "Bus Route", render: (row) => <span className="text-sm text-gray-600">{row.busRoute}</span> },
  { key: "attempts", label: "Attempts", render: (row) => <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">{row.attempts}</span> },
];

const SubLevelManagement = () => {
  const { id: subdepartmentId } = useParams();
  const location = useLocation();
  const level = location.state?.level;

  const [activeSection, setActiveSection] = useState("Students");
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <Header breadcrumbs={[
        { label: "Departments", path: "/department-management" },
        { label: "Sub-Level Management", path: `/subdepartment/${subdepartmentId}/levels` },
        { label: level?.name || "Level Details" },
      ]}>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition w-full sm:w-auto cursor-pointer">
            <MdAdd size={18} /> Add Task
          </button>
        </div>
      </Header>

      <div className="pb-10">
        <div className="border-b border-gray-100 bg-white">
          <div className="flex gap-1 px-3 sm:px-6 overflow-x-auto no-scrollbar scrollbar-none">
            {SECTION_TABS.map((tab) => (
              <button key={tab} onClick={() => { setActiveSection(tab); setSearchTerm(""); }}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition border-b-2 cursor-pointer ${
                  activeSection === tab ? "border-orange-500 text-orange-500 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>{tab}</button>
            ))}
          </div>
        </div>

        <div className="px-3 sm:px-6 py-4 sm:py-6">
          {activeSection === "Students" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                <div className="w-full sm:flex-1">
                  <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <button className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition flex-shrink-0 cursor-pointer">
                    <MdFilterList size={16} /> Filter
                  </button>
                  <div className="flex-shrink-0">
                    <ExportDropdown data={DUMMY_STUDENTS} sectionName="students" />
                  </div>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <CommonTable columns={TABLE_COLUMNS} data={DUMMY_STUDENTS} editable={true} pagination={true} rowsPerPage={10} searchTerm={searchTerm} />
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {DUMMY_STUDENTS.map((row) => {
                  const initials = row.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={row._id} className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 truncate">{row.name}</h4>
                            <span className="text-[10.5px] text-gray-400 block">{row.fatherName}</span>
                          </div>
                        </div>
                        <span className="bg-blue-100 text-blue-700 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full shrink-0">{row.course}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">Mobile</span>
                          <span className="font-medium text-gray-700">{row.mobile}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">Bus Route</span>
                          <span className="font-medium text-gray-700">{row.busRoute}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeSection === "Syllabus" && <SyllabusTab level={level} subLevel={level} />}
          {activeSection === "Tasks" && <TasksTab level={level} subLevel={level} />}
          {activeSection === "Progress" && <div className="py-16 text-center text-gray-400 text-sm">Progress content coming soon</div>}
        </div>
      </div>
    </>
  );
};

export default SubLevelManagement;
