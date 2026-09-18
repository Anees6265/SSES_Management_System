import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, TrendingUp, User,
  LogOut, Menu, X, ShieldCheck, FolderOpen, Award, FileText, Users, BookOpen
} from "lucide-react";
import { toast } from "react-toastify";
import logo from "../../../assets/images/logo-ssism.png";

const navItems = [
  { to: "/student-portal/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { to: "/student-portal/syllabus",    icon: BookOpen,        label: "My Syllabus" },
  { to: "/student-portal/tasks",        icon: ClipboardList,   label: "My Tasks" },
  { to: "/student-portal/progress",     icon: TrendingUp,      label: "Level History" },
  { to: "/student-portal/permissions",  icon: ShieldCheck,     label: "Permissions" },
  { to: "/student-portal/documents",    icon: FolderOpen,      label: "Documents" },
  { to: "/student-portal/placement",    icon: Award,           label: "Placement" },
  { to: "/student-portal/report-card",  icon: FileText,        label: "Report Card" },
  { to: "/student-portal/faculty",      icon: Users,           label: "My Faculty" },
  { to: "/student-portal/profile",      icon: User,            label: "My Profile" },
];

// ── Logout Confirmation Modal ────────────────────────────────────────────────
const LogoutConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Confirm Logout</h3>
            <p className="text-xs text-gray-400 mt-0.5">Are you sure you want to log out?</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <LogOut size={20} />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            You will need to sign in again with your PR Key and password to access your dashboard.
          </p>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function StudentPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Auto-close mobile sidebar whenever route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const studentData = JSON.parse(localStorage.getItem("studentData") || "{}");
  const name = `${studentData.firstName || ""} ${studentData.lastName || ""}`.trim() || "Student";
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentRefreshToken");
    localStorage.removeItem("studentData");
    localStorage.removeItem("role");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-9 w-auto object-contain" />
          <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider leading-tight">Student Portal</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Student Profile & Logout Footer */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="p-2.5 rounded-2xl bg-gray-50/80 border border-gray-100/90 space-y-2.5">
          {/* User Row (Clickable to Profile) */}
          <button
            type="button"
            onClick={() => {
              navigate("/student-portal/profile");
              if (onClose) onClose();
            }}
            className="flex items-center gap-2.5 w-full text-left group"
            title="View Profile"
          >
            <div className="relative shrink-0">
              {studentData.image ? (
                <img
                  src={studentData.image}
                  alt={name}
                  className="w-9 h-9 rounded-xl object-cover border border-gray-200 group-hover:border-orange-400 transition-colors shadow-2xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black border border-orange-200 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-2xs">
                  {initials}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                {name}
              </p>
              <p className="text-[10px] font-semibold text-gray-400 truncate mt-0.5">
                {studentData.prkey || "Student Portal"}
              </p>
            </div>
          </button>

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={() => setLogoutModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-bold text-rose-600 bg-white hover:bg-rose-500 hover:text-white border border-rose-200 hover:border-rose-500 transition-all duration-150 shadow-2xs active:scale-[0.98]"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden print:h-auto print:overflow-visible print:bg-white print:block">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 shrink-0 print:hidden">
        <SidebarContent onClose={null} />
      </aside>

      {/* Mobile Sidebar with Smooth Slide-in Animation and Backdrop Fade */}
      <div
        className={`fixed inset-0 z-40 md:hidden print:hidden transition-all duration-300 ${
          sidebarOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        }`}
      >
        {/* Backdrop with smooth fade in/out */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            sidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Drawer with smooth slide from left */}
        <aside
          className={`relative z-50 w-64 max-w-[80vw] h-full bg-white shadow-2xl transition-transform duration-300 ease-out transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent onClose={() => setSidebarOpen(false)} />
        </aside>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden print:h-auto print:overflow-visible print:block">

        {/* Navbar */}
        <header className="bg-white border-b border-gray-100 px-3 sm:px-4 h-14 flex items-center justify-between shrink-0 print:hidden">
          <button
            className="md:hidden p-2 rounded-xl text-gray-500 hover:text-orange-600 hover:bg-orange-50 active:scale-95 transition-all duration-150"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <img src={logo} alt="Logo" className="h-7 w-auto object-contain" />
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">Student Portal</span>
          </div>

          {/* Right side — avatar only */}
          <div className="flex items-center gap-2.5 ml-auto">
            {studentData.image ? (
              <img src={studentData.image} alt={name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold border border-orange-200">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-3.5 sm:px-4 md:px-6 pt-2.5 sm:pt-3.5 md:pt-4 pb-8 sm:pb-10 print:h-auto print:overflow-visible print:p-0 print:block">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
