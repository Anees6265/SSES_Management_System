import { useState, useRef } from "react";
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

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [logout] = useLogoutMutation();

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
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition text-xl"
        >
          <FiLogOut />
        </button>
      </div>

      {/* LOGOUT CONFIRM POPUP MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop with blur */}
          <div
            onClick={() => setShowLogoutConfirm(false)}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl z-10 transform transition-all duration-300 scale-100 animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
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
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm transition-all duration-200 hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;


// import { useState, useRef, useEffect } from "react";
// import { FiSettings, FiLogOut } from "react-icons/fi";
// import { useNavigate } from "react-router-dom";
// import profileImg from "../../../assets/images/profile-img.png";
// import { useLogoutMutation } from "../../../redux/api/authApi";
// import { useDispatch } from "react-redux";
// import { logout as logoutAction } from "../../../redux/auth/authSlice";
// import { toast } from "react-toastify";
// import SettingsModal from "./SettingModal";

// const UserProfile = () => {
//   const [open, setOpen] = useState(false);
//   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);
//   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
//   const dropdownRef = useRef(null);
//   const navigate = useNavigate();
//   const dispatch = useDispatch();
//   const user = JSON.parse(localStorage.getItem("user") || "{}");

//   const [logout] = useLogoutMutation();
  
//   const handleLogoutClick = () => {
//     setShowLogoutConfirm(true);
//     setOpen(false);
//   };
  
//   const handleLogout = async () => {
//     try {
//       setIsLoggingOut(true);
//       setShowLogoutConfirm(false);
      
//       // Clear Redux state first
//       dispatch(logoutAction());
      
//       // Try to call logout API, but don't fail if it doesn't work
//       try {
//         const userId = user?.id || user?._id;
//         if (userId) {
//           await logout({ id: userId }).unwrap();
//         }
//       } catch (apiError) {
//         console.warn("Logout API failed, but continuing with local logout:", apiError);
//       }
      
//       toast.success("Logged out successfully");
//       navigate("/login", { replace: true });
//     } catch (err) {
//       console.error("❌ Logout failed:", err);
//       // Even if logout fails, clear Redux state and redirect
//       dispatch(logoutAction());
//       toast.error("Logout completed");
//       navigate("/login", { replace: true });
//     } finally {
//       setIsLoggingOut(false);
//     }
//   };

//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   return (
//     <div className="p-3 border-t bg-white">
//       <div className="relative" ref={dropdownRef}>
//         <div 
//           onClick={() => setOpen((prev) => !prev)}
//           className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition"
//         >
//           <img
//             src={user?.avatar || profileImg}
//             alt="User avatar"
//             className="w-10 h-10 rounded-full object-cover border-2 border-orange-400"
//           />
//           <div className="flex-1 min-w-0">
//             <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || "User"}</p>
//             <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
//           </div>
//         </div>
//         {open && (
//           <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-lg border z-50">
//             <div className="p-4 flex flex-col items-center border-b">
//               <img
//                 src={user?.avatar || profileImg}
//                 alt="User"
//                 className="w-12 h-12 rounded-full mb-2"
//               />
//               <p className="text-sm font-semibold">{user?.name || "Loading..."}</p>
//               <p className="text-xs text-gray-500">{user?.email || "Loading..."}</p>
//             </div>
//             <button
//               onClick={() => setIsSettingsOpen(true)}
//               className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-sm"
//             >
//               <FiSettings className="mr-2" /> Settings
//             </button>
//             <button
//               onClick={handleLogoutClick}
//               disabled={isLoggingOut}
//               className="flex items-center w-full px-4 py-3 hover:bg-gray-100 text-sm"
//             >
//               <FiLogOut className="mr-2" />
//               Logout
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Settings Modal */}
//       {isSettingsOpen && (
//         <SettingsModal user={user} onClose={() => setIsSettingsOpen(false)} />
//       )}
      
//       {/* Logout Confirmation Modal */}
//       {showLogoutConfirm && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
//             <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Logout</h3>
//             <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
//             <div className="flex justify-end gap-4">
//               <button
//                 onClick={() => setShowLogoutConfirm(false)}
//                 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleLogout}
//                 disabled={isLoggingOut}
//                 className="bg-[#FDA92D] text-md text-white px-3 py-1 rounded-md hover:bg-[#ED9A21] active:bg-[#B66816] transition relative"
//               >
//                 {isLoggingOut ? "Logging out..." : "OK"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UserProfile;
