import React, { useState } from "react";
import { useGetNewPlacedStudentsQuery, useGetAllCompaniesQuery } from "../../../redux/api/authApi";
import { pdf } from "@react-pdf/renderer";
import CreatePostModal from "./CreatePostModal";
import CommonTable from "../../shared/table/CommonTable";
import Loader from "../../shared/loader/Loader";
import Header from "../../shared/sidebar/Header";
import StatsCard from "./dashboard/StatsCard";
import PlacementPostPDF from "./PlacementPostPDF";
import Avatar from "../../shared/Avatar";
import profile from "../../../assets/images/profileImgDummy.jpeg";
import iteg from "../../../assets/images/logo.png";
import ssism from "../../../assets/images/logo-ssism.png";
import { 
  MdSchool, MdAttachMoney, MdBusiness, MdFileDownload, 
  MdSearch, MdGridView, MdViewList, MdEdit, MdTrendingUp 
} from "react-icons/md";

const PlacementPost = () => {
  const [isCreatePostModalOpen, setCreatePostModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState("");

  const { data: placedRes, isLoading, error, refetch } = useGetNewPlacedStudentsQuery();
  const { data: companiesData } = useGetAllCompaniesQuery();

  const allPlacedStudents = placedRes?.data || [];

  const placedStudents = allPlacedStudents.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.placedInfo?.companyName?.toLowerCase().includes(q) ||
      s.placedInfo?.jobProfile?.toLowerCase().includes(q)
    );
  });

  const toTitleCase = (str) =>
    str?.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  const smartCapitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const downloadPost = async (student) => {
    try {
      const blob = await pdf(<PlacementPostPDF student={student} />).toBlob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${student.firstName}_${student.lastName}_placement_post.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error downloading post:', err);
      alert('Failed to download post. Please try again.');
    }
  };

  const columns = [
    {
      key: "profile",
      label: "Placed Student",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
          <div>
            <p className="font-bold text-gray-800 text-sm">{toTitleCase(row.firstName)} {toTitleCase(row.lastName)}</p>
            <p className="text-[11px] text-gray-400 font-medium">{row.course || 'Course'}</p>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      label: "Hiring Company",
      render: (row) => (
        <span className="font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md text-xs">
          {smartCapitalize(row.placedInfo?.companyName || '—')}
        </span>
      ),
    },
    {
      key: "position",
      label: "Job Profile",
      render: (row) => (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
          {toTitleCase(row.placedInfo?.jobProfile || '—')}
        </span>
      ),
    },
    {
      key: "salary",
      label: "Offered CTC",
      render: (row) => (
        <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs border border-emerald-100">
          {row.placedInfo?.salary ? `₹${(row.placedInfo.salary / 100000).toFixed(1)} LPA` : '—'}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStudent(row);
              setCreatePostModalOpen(true);
            }}
            className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
          >
            <MdEdit /> Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadPost(row);
            }}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
          >
            <MdFileDownload /> Poster PDF
          </button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen p-6">
        <Header title="Placement Stories" />
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-red-200 text-center shadow-sm mt-12">
          <h3 className="text-base font-bold text-gray-800">Error Loading Stories</h3>
          <p className="text-xs text-red-500 mt-1">Failed to fetch placed student posts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Header 
        title="Placement Posts & Stories" 
        breadcrumbs={[{ label: "Placements", path: "/placements/dashboard" }, { label: "Placement Stories" }]}
      />

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ── Top Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Placement Posts"
            value={allPlacedStudents.length}
            icon={<MdSchool />}
            color="orange"
            trend="Success Stories"
            sub="published campus offers"
          />
          <StatsCard
            title="Top Salary Package"
            value="₹18.0 LPA"
            icon={<MdAttachMoney />}
            color="green"
            trend="Highest CTC"
            sub="recorded offer"
          />
          <StatsCard
            title="Average Package"
            value="₹4.5 LPA"
            icon={<MdTrendingUp />}
            color="purple"
            trend="Avg Salary"
            sub="across all drives"
          />
          <StatsCard
            title="Corporate Partners"
            value="32 Companies"
            icon={<MdBusiness />}
            color="blue"
            trend="Hiring Partners"
            sub="active recruiters"
          />
        </div>

        {/* ── Toolbar: Search & View Switcher ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Search student name, company, or job role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 w-full transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-orange-600 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <MdGridView className="text-sm" /> Poster Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-orange-600 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <MdViewList className="text-sm" /> Data Table
              </button>
            </div>
          </div>
        </div>

        {/* ── Content: Cards Grid OR Common Table ── */}
        {placedStudents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <MdSchool className="text-5xl text-gray-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-gray-800">No Placement Stories Found</h3>
            <p className="text-xs text-gray-400 mt-1">Success stories will appear here as students get placed</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {placedStudents.map((student, index) => (
              <div
                key={student._id || index}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 aspect-square flex flex-col items-center justify-between p-4 relative"
              >
                {/* Header section with Logos & Congratulations */}
                <div className="w-full text-center">
                  <div className="flex justify-between items-center mb-1">
                    <img src={iteg} alt="ITEG" className="h-12 object-contain" />
                    <img src={ssism} alt="SSISM" className="h-12 object-contain" />
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-extrabold text-[#133783] -mt-1 tracking-tight">Congratulations</h3>
                  <p className="text-sm sm:text-base text-gray-500 font-medium">We are proud to announce that <br />Our ITEG student</p>
                </div>

                {/* Circular Student Image with triple border */}
                <div className="flex justify-center items-center flex-1 my-1">
                  <div className="rounded-full p-1 bg-white">
                    <div className="rounded-full p-1 bg-orange-500">
                      <div className="rounded-full p-1 bg-white">
                        <img
                          src={student.image || profile}
                          alt={`${student.firstName} ${student.lastName}`}
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Placement Info */}
                <div className="w-full text-center pt-2">
                  <h3 className="text-base sm:text-lg font-bold text-[#133783] mb-0.5">
                    {toTitleCase(student.firstName)} {toTitleCase(student.lastName)}
                  </h3>
                  <p className="text-xs text-gray-700 font-medium">{student.village || "Location"}</p>
                  <p className="text-xs font-semibold text-gray-800">{student.course || "Course"}</p>
                  
                  <div className="mt-2 relative">
                    <div className="border-t border-gray-300 w-1/5 mx-auto mb-2"></div>
                    <p className="text-xs text-gray-700">got placed as a <span className="font-bold text-gray-900">
                      {toTitleCase(student.placedInfo?.jobProfile) || "Position"}
                    </span> in</p>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <p className="text-sm font-extrabold text-[#133783]">
                        {smartCapitalize(student.placedInfo?.companyName) || "Company"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating Top Right Actions */}
                <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStudent(student);
                      setCreatePostModalOpen(true);
                    }}
                    className="bg-gray-700/90 hover:bg-orange-600 text-white p-2 rounded-full transition-colors shadow-md text-xs"
                    title="Update Post"
                  >
                    <MdEdit className="text-sm" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadPost(student);
                    }}
                    className="bg-gray-700/90 hover:bg-orange-600 text-white p-2 rounded-full transition-colors shadow-md text-xs"
                    title="Download Poster PDF"
                  >
                    <MdFileDownload className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <CommonTable
              columns={columns}
              data={placedStudents}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              pagination
              rowsPerPage={10}
            />
          </div>
        )}

      </div>

      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => { setCreatePostModalOpen(false); setSelectedStudent(null); }}
        student={selectedStudent}
        isUpdateMode={true}
        onSuccess={refetch}
      />
    </div>
  );
};

export default PlacementPost;
