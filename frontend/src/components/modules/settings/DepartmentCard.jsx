/* eslint-disable react/prop-types */
import { MdBusiness } from "react-icons/md";

const DepartmentCard = ({ name, description, hod, students, status, onView, onEdit }) => {
  const isActive = status === "Active";

  return (
    <div className="bg-[#f9fafb] border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col min-h-[340px]">
      <div className="p-6 flex-1">
        {/* Top row: icon + status badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-full border border-orange-200 bg-orange-50 flex items-center justify-center">
            <MdBusiness className="text-orange-500" size={26} />
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full tracking-wide ${
              isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
            }`}
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{description}</p>

        <div className="border-t border-gray-200 my-3" />

        {/* Meta info */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span>HOD: {hod || "Not assigned"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🎓</span>
            <span>Students: {students}</span>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-3 p-4 bg-gray-50">
        <button
          onClick={onView}
          className="w-1/2 border border-gray-300 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
        >
          VIEW
        </button>
        <button
          onClick={onEdit}
          className="w-1/2 bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-orange-600 transition"
        >
          EDIT
        </button>
      </div>
    </div>
  );
};

export default DepartmentCard;
