/* eslint-disable react/prop-types */
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu } from "lucide-react";
import { useSidebar } from "../../../contexts/SidebarContext";

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

const Header = ({
  title,
  badge,
  subtitle,
  children,
  breadcrumbs = [],
  bottomRow = null,
  showBack,
  showBackButton,
  onBack,
  onBackClick,
  backPath,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarContext = useSidebar();
  const openMobileSidebar = sidebarContext?.openMobileSidebar;

  const isSidebarRoot = SIDEBAR_ROOT_PATHS.includes(location.pathname);
  const hasBackProp = showBack !== undefined ? showBack : showBackButton;
  const shouldShowBack = hasBackProp !== undefined
    ? Boolean(hasBackProp)
    : !isSidebarRoot;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onBackClick) {
      onBackClick();
    } else if (backPath) {
      navigate(backPath);
    } else if (breadcrumbs.length > 1 && breadcrumbs[breadcrumbs.length - 2]?.path) {
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      if (typeof parentCrumb.path === "number") {
        navigate(parentCrumb.path);
      } else {
        navigate(parentCrumb.path, { state: parentCrumb.state });
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">

      {/* Mobile top bar */}
      <div className="lg:hidden border-b border-gray-200">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {shouldShowBack ? (
              <button
                onClick={handleBack}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg text-gray-600 hover:text-orange-500 transition flex-shrink-0 cursor-pointer"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft size={18} />
              </button>
            ) : openMobileSidebar ? (
              <button
                onClick={openMobileSidebar}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg text-gray-600 hover:text-orange-500 transition flex-shrink-0 cursor-pointer"
                title="Open Sidebar"
                aria-label="Open Sidebar"
              >
                <Menu size={18} />
              </button>
            ) : null}
            <h1 className="text-sm font-semibold text-gray-800 truncate">{title}</h1>
            {badge && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>
        {children && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 flex-wrap">
            {children}
          </div>
        )}
      </div>

      {/* Desktop header */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {shouldShowBack && (
              <button
                onClick={handleBack}
                className="group flex items-center gap-2 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 text-gray-700 hover:text-gray-900 flex-shrink-0 cursor-pointer"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-800 truncate">{title}</h1>
                {badge && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium whitespace-nowrap flex-shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Row (e.g. level tabs) */}
      {bottomRow && (
        <div className="px-3 sm:px-4 md:px-6 border-b border-gray-200 bg-white">
          {bottomRow}
        </div>
      )}

    </header>
  );
};

export default Header;
