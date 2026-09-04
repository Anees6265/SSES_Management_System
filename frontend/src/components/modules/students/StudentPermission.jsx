import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetDummyStudentsQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import CommonTable from "../../shared/table/CommonTable";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import SearchBox from "../../shared/search-export/SearchBox";

const STATUS_STYLES = {
  Dummy: "bg-orange-100 text-orange-700 border-orange-200",
};

const toTitleCase = (str = "") =>
  str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const StudentPermission = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  const { data, isLoading, isError, error } = useGetDummyStudentsQuery();
  const students = data?.data || [];

  const filteredData = students.filter((student) => {
    const q = searchTerm.toLowerCase();
    return [
      student.firstName,
      student.lastName,
      student.studentMobile,
      student.course,
      student.prkey,
      student.dummyDetails?.reason,
      student.dummyDetails?.remark,
    ].join(" ").toLowerCase().includes(q);
  });

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {toTitleCase(`${row.firstName || ""} ${row.lastName || ""}`)}
            </p>
            <p className="text-xs text-gray-500">{row.prkey || row.studentMobile || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "level",
      label: "Level",
      render: (row) => (
        <div className="text-sm text-gray-700">
          <p>{row.currentLevelId?.name || "-"}</p>
          <p className="text-xs text-gray-400">{row.currentSubLevelId?.name || "-"}</p>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason / Remark",
      render: (row) => (
        <div className="max-w-xs text-sm text-gray-700">
          <p className="font-medium">{row.dummyDetails?.reason || "No reason provided"}</p>
          {row.dummyDetails?.remark && (
            <p className="mt-0.5 text-xs text-gray-400">{row.dummyDetails.remark}</p>
          )}
        </div>
      ),
    },
    {
      key: "markedAt",
      label: "Marked On",
      render: (row) =>
        row.dummyDetails?.markedAt
          ? new Date(row.dummyDetails.markedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[row.status] || STATUS_STYLES.Dummy}`}>
          {row.status || "Dummy"}
        </span>
      ),
    },
    {
      key: "application",
      label: "Application",
      render: (row) =>
        row.dummyDetails?.applicationURL ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewDoc(row.dummyDetails);
            }}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200 transition"
          >
            View
          </button>
        ) : (
          <span className="text-xs text-gray-400">No Doc</span>
        ),
    },
  ];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-medium">{error?.data?.message || "Something went wrong."}</p>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Dummy Students"
        showBack={false}
        badge={`${students.length} dummy students`}
        breadcrumbs={[
          { label: "Academics" },
          { label: "Dummy Students" },
        ]}
      />

      <div className="p-5 space-y-4">
        {/* Search box */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex-wrap">
          <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>

        <CommonTable
          data={filteredData}
          columns={columns}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onRowClick={(row) => navigate(`/student-profile/${row._id}`)}
          pagination
          rowsPerPage={10}
        />
      </div>

      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 max-w-lg w-full mx-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Dummy Student Application</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                &times;
              </button>
            </div>

            {previewDoc.applicationType === "image" ? (
              <img src={previewDoc.applicationURL} alt="Dummy Student Application" className="w-full rounded-lg object-contain max-h-[70vh]" />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                PDF application available.
              </div>
            )}

            <a
              href={previewDoc.applicationURL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-sm text-orange-600 hover:underline"
            >
              Open in new tab
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentPermission;
