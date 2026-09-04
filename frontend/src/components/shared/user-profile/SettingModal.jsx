/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useUpdateUserMutation } from "../../../redux/api/authApi";
import { toast } from "react-toastify";
import profileImg from "../../../assets/images/profile-img.png";
import FaceRegistration from "../../modules/face-auth/FaceRegistration";
import { X } from "lucide-react";

const SettingsModal = ({ user, isOpen, onClose }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || "",
        position: user?.position || "",
        role: user?.role || "",
        department: user?.department || "",
        isActive: user?.isActive ?? true,
    });
    const [showFaceRegistration, setShowFaceRegistration] = useState(false);
    const [hasFaceRegistered, setHasFaceRegistered] = useState(false);

    const [updateUser, { isLoading }] = useUpdateUserMutation();

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            setTimeout(() => setIsDrawerOpen(true), 10);
            checkFaceRegistration();
        } else {
            setIsDrawerOpen(false);
            setTimeout(() => setIsMounted(false), 300);
        }
    }, [isOpen]);

    const checkFaceRegistration = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL.replace('/api', '')}/api/face-auth/check-face/${user?.email}`);
            const data = await response.json();
            if (data.success) {
                setHasFaceRegistered(data.hasFaceRegistered);
            }
        } catch (error) {
            console.error('Error checking face registration:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updatedData = {
            ...(formData.name && { name: formData.name }),
            ...(formData.position && { position: formData.position }),
            ...(formData.role && { role: formData.role }),
            ...(formData.department && { department: formData.department }),
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
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* BACKDROP */}
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
                    isDrawerOpen ? "opacity-100" : "opacity-0"
                }`}
            />

            {/* DRAWER PANEL */}
            <div
                className={`relative w-full max-w-md h-full bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out ${
                    isDrawerOpen ? "translate-x-0" : "translate-x-full"
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
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                            />
                            <span className="text-sm">Active</span>
                        </label>

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
                    </form>
                </div>

                {/* FOOTER BUTTONS */}
                <div className="px-6 py-5 border-t bg-white">
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FDA92D] to-[#FDB84D] text-white font-semibold shadow-md hover:shadow-lg transition"
                        >
                            {isLoading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </div>
            
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
