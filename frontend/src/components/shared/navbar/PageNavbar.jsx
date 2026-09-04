/* eslint-disable react/prop-types */
import { HiArrowNarrowLeft } from "react-icons/hi";
import { useNavigate, useLocation } from "react-router-dom";

const SIDEBAR_ROOT_PATHS = [
  "/",
  "/attendance-details",
  "/department-management",
  "/student-detail-table",
  "/leave-requests",
  "/student-permission",
  "/task-management",
  "/curriculum-management",
  "/placements/dashboard",
  "/readiness-status",
  "/company-details",
  "/placement-post",
  "/user-management",
  "/settings",
  "/session-management",
  "/support",
  "/subdepartments",
  "/levels"
];

const PageNavbar = ({
  title,
  subtitle,
  onBack,
  onBackClick,
  rightContent = null,
  showBackButton,
  breadcrumbs = []
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleBack = onBack || onBackClick || (() => navigate(-1));

  const isSidebarRoot = SIDEBAR_ROOT_PATHS.includes(location.pathname);
  const shouldShowBack = showBackButton !== undefined
    ? Boolean(showBackButton)
    : !isSidebarRoot;

  return (
    <div className="sticky top-0 z-10">
      <div className="px-1 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {shouldShowBack && (
              <button
                onClick={handleBack}
                className="group flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 text-gray-700 hover:text-gray-900 cursor-pointer"
              >
                <HiArrowNarrowLeft className="text-lg group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
            {shouldShowBack && <div className="h-8 w-px bg-gray-300"></div>}
            <div>
              <h1 className="text-2xl font-bold text-black">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {rightContent && (
            <div className="flex items-center gap-3">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageNavbar;