import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, TrendingUp, User,
  LogOut, Menu, X, ShieldCheck, FolderOpen, Award, FileText, Users
} from "lucide-react";
import { toast } from "react-toastify";
import logo from "../../../assets/images/logo-ssism.png";

const navItems = [
  { to: "/student-portal/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
    </div>
  );
};

export default function StudentPortalLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

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

      {/* Logout */}
      <div className="px-2 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-gray-50">
          {studentData.image ? (
            <img src={studentData.image} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
          </div>
        </div>
        <button
          onClick={() => setLogoutModalOpen(true)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-150"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 shrink-0">
        <SidebarContent onClose={null} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-56 h-full bg-white shadow-xl">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Navbar */}
        <header className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0">
          <button
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            onClick={() => setSidebarOpen(true)}
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
