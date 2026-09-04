import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { IoSettingsSharp } from "react-icons/io5";
import { MdSupportAgent } from "react-icons/md";
import { FaClipboardList , FaUserGroup} from "react-icons/fa6";
import { MdWork, MdDashboard } from "react-icons/md";
import { HiChevronUp, HiChevronDown, HiChevronLeft, HiChevronRight } from "react-icons/hi";
import UserProfile from "../user-profile/UserProfile";
import { usePermissions } from "../../../hooks/usePermissions";
import { useSidebar } from "../../../contexts/SidebarContext";
import logo from "../../../assets/images/logo.png";
import logoo from "../../../assets/images/logo-ssism.png";


const Sidebar = ({ children }) => {
  const location = useLocation();
  const { hasPermission } = usePermissions();


  const isMobile = () => window.innerWidth < 1024;
  const [isOpen, setIsOpen] = useState(() => !isMobile());
  const { isMobileOpen, closeMobileSidebar } = useSidebar();


  const role = (localStorage.getItem("role") || "").toLowerCase();

  // admin/superadmin go to dept selector, faculty goes directly to student list
  const studentProgressPath = (role === "superadmin" || role === "admin")
    ? "/student-detail-table"
    : "/student-detail-table";


  const getActiveMenus = (path) => {
    if (path === "/" || path.startsWith("/attendance-")) {
      return ["Dashboard"];
    }
    if (
      path.startsWith("/student") ||
      path.startsWith("/department") ||
      path.startsWith("/subdepartment") ||
      path.startsWith("/leave-requests") ||
      path.startsWith("/show-sublevel-tables") ||
      path.startsWith("/setting/student-profile") ||
      path.startsWith("/task-") ||
      path.startsWith("/curriculum-") ||
      path.startsWith("/levels")
    ) {
      return ["Academics"];
    }
    if (
      path.startsWith("/readiness-status") ||
      path.startsWith("/placement") ||
      path.startsWith("/company-") ||
      path.startsWith("/interview-")
    ) {
      return ["Placements"];
    }
    if (path.startsWith("/user-")) {
      return ["User Management"];
    }
    return [];
  };


  const [openMenus, setOpenMenus] = useState(() => getActiveMenus(location.pathname));


  useEffect(() => {
    const newMenus = getActiveMenus(location.pathname);
    setOpenMenus(newMenus);
  }, [location.pathname]);


  const toggleMenu = (name) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [name]
    );
  };


  const isSubMenuActive = (subPath) => {
    const path = location.pathname;


    if (subPath === "/") return path === "/";
    if (subPath === "/attendance-details") return path === "/attendance-details";


    if (subPath === "/admission-process") {
      return (
        path === "/admission-process" ||
        path.startsWith("/admission/") ||
        path.startsWith("/interview-detail/") ||
        path === "/admission-record"
      );
    }


    if (subPath === "/student-detail-table") {
      return (
        path === "/student-detail-table" ||
        path.startsWith("/student-profile/") ||
        path.startsWith("/student-level-interviews/") ||
        path.startsWith("/student/")
      );
    }


    if (subPath === "/department-management") {
      return (
        path === "/department-management" ||
        path.startsWith("/department-details/") ||
        path === "/subdepartment-details"
      );
    }


    if (subPath === "/task-management") return path === "/task-management";


    if (subPath === "/curriculum-management") return path === "/curriculum-management";


    if (subPath === "/student-permission") return path === "/student-permission";
    if (subPath === "/leave-requests") return path === "/leave-requests";


    if (subPath === "/readiness-status") {
      return (
        path === "/readiness-status" ||
        path.startsWith("/interview-history/") ||
        path.startsWith("/interview-rounds-history/")
      );
    }


    if (subPath === "/company-details") {
      return path === "/company-details" || path.startsWith("/placement/");
    }


    if (subPath === "/placement-post") return path === "/placement-post";


    return path === subPath || path.startsWith(subPath + "/");
  };


  const menuItems = [
    {
      name: "Dashboard",
      icon: <MdDashboard />,
      permission: "Page_Dashboard",
      subMenu: [
        { name: "Dashboard", path: "/", permission: "Page_Dashboard" },
        { name: "Attendance Details", path: "/attendance-details", permission: "Page_AttendanceDetails" },
      ],
    },
    {
      name: "Academics",
      icon: <FaClipboardList />,
      permission: "Page_AdmittedStudents",
      subMenu: [
        { name: "Department", path: "/department-management", permission: "Page_Department" },
        { name: "Student Progress", path: "/student-detail-table", permission: "Page_AdmittedStudents" },
        { name: "Leave Requests", path: "/leave-requests", permission: "Page_LeaveRequests" },
        { name: "Dummy Students", path: "/student-permission", permission: "Page_DummyStudents" },
        { name: "Task Management", path: "/task-management", permission: "Page_TaskManagement" },
        { name: "Curriculum Management", path: "/curriculum-management", permission: "Page_CurriculumManagement" },
      ],
    },
    {
      name: "Placements",
      icon: <MdWork />,
      permission: "Page_Placement",
      subMenu: [
        ...(role === "superadmin" || role === "admin" || role === "hod" || role === "faculty" || role === "placement_officer"
          ? [
              { name: "Dashboard", path: "/placements/dashboard", permission: "Page_Placement" },
              { name: "Placement Drives", path: "/placements/drives", permission: "Page_Placement" },
              { name: "Resume Sharing", path: "/placements/resume-sharing", permission: "Page_Placement" }
            ]
          : []),
        { name: "Placement Candidates", path: "/readiness-status", permission: "Page_Placement" },
        { name: "Company Details", path: "/company-details", permission: "Page_CompanyDetails" },
        { name: "Placed Students", path: "/placement-post", permission: "Page_PlacedStudents" },
      ],
    },
    {
      name: "User Management",
      icon: <FaUserGroup />,
      permission: "Page_UserManagement",
      subMenu: [
        { name: "Users", path: "/user-management", permission: "Page_UserManagement" },
      ],
    },
  ];


  const systemDirectLinks = [
    { name: "Settings", path: "/settings", icon: <IoSettingsSharp />, permission: "Page_Settings" },
    { name: "Sessions", path: "/session-management", icon: <MdDashboard />, permission: "Page_SessionManagement" },
    { name: "Support", path: "/support", icon: <MdSupportAgent />, permission: "Page_Support" },
  ];


  const showAll = role === "superadmin" || role === "admin";
  const displayedMenuItems = showAll ? menuItems : menuItems.filter(item => hasPermission(item.permission, 'read'));

  const NavContent = ({ onClose }) => (
    <>
      <nav className="flex flex-col gap-1 px-2 py-2 overflow-y-auto h-[calc(100vh-180px)]">
        {displayedMenuItems.map((item, idx) => {
          const filteredSubMenu = showAll
            ? item.subMenu
            : item.subMenu.filter(subItem => hasPermission(subItem.permission, 'read'));

          if (filteredSubMenu.length === 0) return null;

          const isActive = openMenus.includes(item.name);

          return (
            <div key={idx} className="mb-1">
              <div
                onClick={() => toggleMenu(item.name)}
                className={`flex items-center justify-between px-2 py-2.5 rounded-lg cursor-pointer transition ${
                  isActive ? "bg-orange-100 text-orange-400 font-semibold" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3 text-[15px]">
                  {item.icon}
                  {item.name}
                </div>
                {isActive ? <HiChevronUp size={16} /> : <HiChevronDown size={16} />}
              </div>

              {isActive && (
                <div className="mt-1">
                  {filteredSubMenu.map((sub, i) => {
                    const active = isSubMenuActive(sub.path);
                    return (
                      <Link
                        key={i}
                        to={sub.path}
                        onClick={onClose}
                        className={`block ml-6 px-2 py-2 text-sm transition border-l-2 ${
                          active
                            ? "bg-orange-50 text-orange-400 font-medium border-orange-500"
                            : "text-gray-600 hover:bg-gray-100 border-gray-300"
                        }`}
                      >
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <p className="text-xs text-gray-400 px-3 mt-4 mb-2">SYSTEM</p>
        {systemDirectLinks
          .filter(item => showAll || hasPermission(item.permission, 'read'))
          .map((item, idx) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-2 py-2.5 rounded-lg text-[15px] transition mb-1 ${
                  active ? "bg-orange-100 text-orange-400 font-semibold" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
      </nav>


      <div className="absolute bottom-0 left-0 right-0 border-t bg-gray-50">
        <UserProfile />
      </div>
    </>
  );


  return (
    <>
      {/* ── MOBILE OVERLAY DRAWER ── */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={closeMobileSidebar} />
          <aside className="relative w-64 h-full bg-white border-r border-gray-200 flex flex-col z-10">
            <div className="flex items-center justify-between px-4 py-5">
              <img src={logo} alt="Logo" className="h-16 w-auto" />
              <button onClick={closeMobileSidebar} className="text-gray-500 hover:text-gray-700">
                <HiChevronLeft size={22} />
              </button>
            </div>
            <NavContent onClose={closeMobileSidebar} />
          </aside>
        </div>
      )}


      {/* ── DESKTOP SIDEBAR ── */}
      <div className="hidden lg:flex">
        <aside
          className={`fixed top-0 left-0 z-20 h-screen transition-all duration-300 bg-white border-r border-gray-200 ${
            isOpen ? "w-64" : "w-16"
          }`}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute top-16 -right-3 transform -translate-y-1/2 w-10 h-10 bg-white text-gray-600 rounded-full shadow-md hover:shadow-lg border border-gray-200 transition-all duration-300 flex items-center justify-center z-10"
          >
            {isOpen ? <HiChevronLeft size={20} /> : <HiChevronRight size={20} />}
          </button>


          <div className="flex items-center gap-3 px-4 py-5">
            {isOpen ? (
              <img src={logo} alt="Logo" className="h-20 w-auto" />
            ) : (
              <img src={logoo} alt="Logo" className="h-8 w-auto" />
            )}
          </div>


          {isOpen && <NavContent onClose={null} />}
        </aside>
      </div>


      {/* ── MAIN CONTENT ── */}
      <main
        className={`bg-[#F8F7F5] min-h-screen transition-all duration-300 ${
          isOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        {children}
      </main>
    </>
  );
};




export default Sidebar;
