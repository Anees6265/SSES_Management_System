/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useUpdateUserMutation } from "../../../redux/api/authApi";
import { toast } from "react-toastify";
import profileImg from "../../../assets/images/profile-img.png";
// import FaceRegistration from "../../modules/face-auth/FaceRegistration"; // Face recognition disabled
import { X, Check } from "lucide-react";
import { API_BASE_URL } from "../../../config/apiConfig";

const SettingsModal = ({ user, isOpen, onClose }) => {
    const isGlobalAdmin = ['superadmin', 'admin'].includes(user?.role?.toLowerCase());
    const [isMounted, setIsMounted] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || "",
        position: user?.position || "",
        role: user?.role || "",
        department: isGlobalAdmin ? "SSISM" : (user?.department || ""),
        isActive: user?.isActive ?? true,
    });
    // Face recognition disabled
    // const [showFaceRegistration, setShowFaceRegistration] = useState(false);
    // const [hasFaceRegistered, setHasFaceRegistered] = useState(false);

    const [updateUser, { isLoading }] = useUpdateUserMutation();

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            setTimeout(() => setIsDrawerOpen(true), 10);
            // checkFaceRegistration(); // Face recognition disabled
        } else {
            setIsDrawerOpen(false);
            setTimeout(() => setIsMounted(false), 300);
        }
    }, [isOpen]);

    // Face registration disabled
    // const checkFaceRegistration = async () => {
    //     try {
    //         const response = await fetch(`${import.meta.env.VITE_API_URL.replace('/api', '')}/api/face-auth/check-face/${user?.email}`);
    //         const data = await response.json();
    //         if (data.success) {
    //             setHasFaceRegistered(data.hasFaceRegistered);
    //         }
    //     } catch (error) {
    //         console.error('Error checking face registration:', error);
    //     }
    // };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const resolvedDept = isGlobalAdmin ? "SSISM" : formData.department;
        const updatedData = {
            ...(formData.name && { name: formData.name }),
            ...(formData.position && { position: formData.position }),
            ...(formData.role && { role: formData.role }),
            department: resolvedDept,
            ...(typeof formData.isActive === "boolean" && { isActive: formData.isActive }),
            updatedAt: new Date(),
        };

        try {
            const response = await updateUser({
                id: user.id || user._id,
                data: updatedData,
            }).unwrap();

            toast.success("Profile updated successfully!");
            localStorage.setItem("user", JSON.stringify(response.user));
            onClose();
        } catch (error) {
            toast.error(error?.data?.message || "Failed to update profile");
        }
    };

    if (!isMounted) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            onClick={onClose}
        >
            {/* BACKDROP */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ${
                    isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            />

            {/* POPUP MODAL PANEL */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-full sm:max-w-lg max-h-[90vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden z-10 transform transition-all duration-200 ease-out ${
                    isDrawerOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2 pointer-events-none"
                }`}
            >
                {/* HEADER */}
                <div className="bg-white p-6 flex flex-col items-center relative border-b border-gray-100">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                    <div className="relative">
                        <img
                            src={user?.avatar || profileImg}
                            alt="Profile"
                            className="rounded-full w-20 h-20 object-cover border-2 border-white"
                        />
                        <span className="absolute bottom-1 right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white" />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{user?.email}</p>
                    <h2 className="font-bold text-lg mt-1">Edit Profile</h2>
                </div>

                {/* CONTENT (scrollable) */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder=" "
                                className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-[#FDA92D] transition-all duration-200"
                            />
                            <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${formData.name ? 'text-xs -top-2 text-black' : 'text-gray-500 top-3'}`}>
                                Name
                            </label>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                placeholder=" "
                                className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-[#FDA92D] transition-all duration-200"
                            />
                            <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${formData.position ? 'text-xs -top-2 text-black' : 'text-gray-500 top-3'}`}>
                                Position
                            </label>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                placeholder=" "
                                className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-[#FDA92D] transition-all duration-200"
                            />
                            <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${formData.role ? 'text-xs -top-2 text-black' : 'text-gray-500 top-3'}`}>
                                Role
                            </label>
                        </div>
                        {isGlobalAdmin ? (
                            <div className="relative">
                                <div className="h-12 w-full border border-gray-200 bg-gray-50 px-3 rounded-md flex items-center text-sm font-semibold text-gray-700 gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    SSISM (Institution Wide)
                                </div>
                                <label className="absolute left-3 bg-white px-1 text-xs -top-2 text-gray-500 pointer-events-none font-medium">
                                    Department
                                </label>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    placeholder=" "
                                    className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-[#FDA92D] transition-all duration-200"
                                />
                                <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${formData.department ? 'text-xs -top-2 text-black' : 'text-gray-500 top-3'}`}>
                                    Department
                                </label>
                            </div>
                        )}
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                            />
                            <span className="text-sm">Active</span>
                        </label>

                        {/* Face Recognition (Disabled)
                        <div className="border-t pt-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Face Recognition</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                    {hasFaceRegistered ? 'Face registered ✓' : 'No face registered'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowFaceRegistration(true)}
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                >
                                    {hasFaceRegistered ? 'Update Face' : 'Register Face'}
                                </button>
                            </div>
                        </div>
                        */}
                    </form>
                </div>

                {/* FOOTER BUTTONS */}
                <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-gray-150 bg-white">
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-5 py-2 sm:py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer inline-flex items-center justify-center text-center shrink-0"
                        >
                            <span>Cancel</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full sm:w-auto px-5 py-2 sm:py-2.5 rounded-xl !bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold tracking-wider uppercase text-xs sm:text-sm shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.97] cursor-pointer inline-flex items-center justify-center gap-1.5 sm:gap-2 text-center shrink-0 disabled:opacity-50"
                        >
                            <Check size={16} />
                            <span>{isLoading ? "Saving..." : "Save"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Face Registration Modal (Disabled)
            {showFaceRegistration && (
                <FaceRegistration
                    email={user?.email}
                    onRegistrationSuccess={() => {
                        setShowFaceRegistration(false);
                        setHasFaceRegistered(true);
                        toast.success('Face registered successfully!');
                    }}
                    onClose={() => setShowFaceRegistration(false)}
                />
            )}
            */}
        </div>
    );
};

export default SettingsModal;


// /* eslint-disable react/prop-types */
// import { useState } from "react";
// import { useUpdateUserMutation } from "../../../redux/api/authApi";
// import { toast } from "react-toastify";
// import profileImg from "../../../assets/images/profile-img.png";

// const SettingsModal = ({ user, onClose }) => {
//     const [formData, setFormData] = useState({
//         name: user?.name || "",
//     });

//     const [updateUser, { isLoading }] = useUpdateUserMutation();

//     const handleChange = (e) => {
//         setFormData((prev) => ({
//             ...prev,
//             [e.target.name]: e.target.value,
//         }));
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//             const response = await updateUser({
//                 id: user.id || user._id,
//                 data: { name: formData.name },
//             }).unwrap();

//             toast.success("Profile updated successfully!");
//             localStorage.setItem("user", JSON.stringify(response.user));
//             onClose();
//         } catch (error) {
//             toast.error(error?.data?.message || "Failed to update profile");
//         }
//     };

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-11/12 max-w-md">
//                 <div className="bg-[#FCD2AA] p-6 flex flex-col items-center relative">
//                     <button
//                         onClick={onClose}
//                         className="absolute top-4 right-4 text-gray-700 text-xl hover:text-black"
//                     >
//                         ✕
//                     </button>
//                     <div className="relative">
//                         <img
//                             src={user?.avatar || profileImg}
//                             alt="Profile"
//                             className="rounded-full w-20 h-20 object-cover border-2 border-white"
//                         />
//                         <span className="absolute bottom-1 right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white" />
//                     </div>
//                     <p className="text-sm text-gray-600 mt-2">{user?.email}</p>
//                     <h2 className="font-bold text-lg mt-1">Edit Profile</h2>
//                 </div>

//                 <div className="px-8 py-6 bg-white">
//                     <form onSubmit={handleSubmit} className="space-y-4">
//                         <input
//                             type="text"
//                             name="name"
//                             value={formData.name}
//                             onChange={handleChange}
//                             placeholder="Name"
//                             className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
//                         />
//                         <button
//                             type="submit"
//                             disabled={isLoading}
//                             className="w-full mt-6 bg-[#FDA92D]  hover:bg-orange-600 text-white py-3 rounded-3xl font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
//                         >
//                             {isLoading ? "Saving..." : "Save"}
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default SettingsModal;
