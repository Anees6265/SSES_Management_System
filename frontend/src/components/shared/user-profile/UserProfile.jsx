import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiLogOut, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import profileImg from "../../../assets/images/profile-img.png";
import { useLogoutMutation } from "../../../redux/api/authApi";
import { useDispatch } from "react-redux";
import { logout as logoutAction } from "../../../redux/auth/authSlice";
import { toast } from "react-toastify";
import OrangeButton from "../sidebar/OrangeButton";
import SettingsDrawerContent from "./SettingsDrawerContent";

const UserProfile = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const saveButtonRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const rawUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isGlobalAdmin = ['superadmin', 'admin'].includes(rawUser?.role?.toLowerCase());
  const user = {
    ...rawUser,
    department: isGlobalAdmin ? 'SSISM' : rawUser.department
  };

  useEffect(() => {
    if (isGlobalAdmin && rawUser.department !== 'SSISM') {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [isGlobalAdmin, rawUser.department]);

  const [logout] = useLogoutMutation();

  /* ---------------- ESCAPE & SCROLL LOCK ---------------- */
  useEffect(() => {
    if (!showLogoutConfirm) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowLogoutConfirm(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLogoutConfirm]);

  /* ---------------- LOGOUT ---------------- */

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutConfirm(false);

      dispatch(logoutAction());

      try {
        const userId = user?.id || user?._id;
        if (userId) await logout({ id: userId }).unwrap();
      } catch (apiError) {
        console.warn("Logout API failed but local logout done", apiError);
      }

      toast.success("Logged out successfully");
      navigate("/login", { replace: true });

    } catch (err) {
      console.error(err);
      dispatch(logoutAction());
      toast.error("Logout completed");
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="border-t bg-white">
      {/* PROFILE CARD */}
      <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 transition-colors duration-200">
        {/* Avatar + Name with OrangeButton */}
        <OrangeButton
          buttonTitle={
            <div className="flex items-center gap-3.5 flex-1">
              <div className="relative">
                <img
                  src={user?.profileImage || user?.avatar || profileImg}
                  alt="User avatar"
                  className="w-11 h-11 rounded-full object-cover border-2 border-orange-400 shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[15px] font-semibold text-gray-800 truncate leading-snug">
                  {user?.name || "User Name"}
                </p>
                <p className="text-xs text-gray-500 font-medium truncate">
                  {user?.role || "System Admin"}
                </p>
              </div>
            </div>
          }
          customButtonClass="flex items-center w-full hover:opacity-90 transition bg-transparent p-0"
          panelTitle="Edit Profile"
          panelSubtitle="Update your profile information and settings"
          drawerContent={<SettingsDrawerContent user={user} saveButtonRef={saveButtonRef} />}
          leftBtnText="Cancel"
          rightBtnText="Save"
          onRightClick={() => saveButtonRef.current?.click()}
        />

        {/* Logout icon */}
        <button
          onClick={handleLogoutClick}
          title="Logout"
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-xl cursor-pointer"
        >
          <FiLogOut />
        </button>
      </div>

      {/* LOGOUT CONFIRM POPUP MODAL (Portal to document.body to cover sticky header & sidebar) */}
      {showLogoutConfirm &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop with full blur covering entire window */}
            <div
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl z-10 transform transition-all duration-300 scale-100 animate-in zoom-in-95 duration-200">
              {/* Close button */}
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
                <FiLogOut className="text-2xl" />
              </div>

              {/* Title & Subtitle */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Confirm Logout</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Are you sure you want to logout? This will end your active session on this device.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default UserProfile;

