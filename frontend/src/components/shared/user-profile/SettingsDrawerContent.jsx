/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { useUpdateUserMutation, useChangeUserPasswordMutation } from "../../../redux/api/authApi";
import { toast } from "react-toastify";
import profileImg from "../../../assets/images/profile-img.png";
import { FiCamera, FiCheck, FiLock, FiEye, FiEyeOff, FiChevronDown, FiChevronUp, FiKey } from "react-icons/fi";
import { API_BASE_URL } from "../../../config/apiConfig";

const SettingsDrawerContent = ({ user, saveButtonRef }) => {
    const isGlobalAdmin = ['superadmin', 'admin'].includes(user?.role?.toLowerCase());
    const [formData, setFormData] = useState({
        name: user?.name || "",
        position: user?.position || "",
        role: user?.role || "",
        department: isGlobalAdmin ? "SSISM" : (user?.department || ""),
        isActive: user?.isActive ?? true,
    });
    const [previewUrl, setPreviewUrl] = useState("");
    const [profileImageBase64, setProfileImageBase64] = useState("");
    const fileInputRef = useRef(null);

    const [updateUser, { isLoading }] = useUpdateUserMutation();

    // Password Change State
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [changeUserPassword, { isLoading: isChangingPassword }] = useChangeUserPasswordMutation();

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!currentPassword) {
            toast.error("Please enter your current password");
            return;
        }
        if (!newPassword) {
            toast.error("Please enter your new password");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters long");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        try {
            const res = await changeUserPassword({
                currentPassword,
                newPassword,
                confirmPassword,
            }).unwrap();
            toast.success(res?.message || "Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordSection(false);
        } catch (err) {
            console.error("Change password error:", err);
            toast.error(err?.data?.message || err?.message || "Failed to change password");
        }
    };

    // Face recognition disabled
    // useEffect(() => {
    //     checkFaceRegistration();
    // }, []);

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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewUrl(event.target.result);
            setProfileImageBase64(event.target.result);
        };
        reader.onerror = () => {
            toast.error("Error reading file");
        };
        reader.readAsDataURL(file);
    };

    const triggerImageUpload = () => {
        fileInputRef.current?.click();
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
            ...(profileImageBase64 && { profileImage: profileImageBase64 }),
            updatedAt: new Date(),
        };

        try {
            const response = await updateUser({
                id: user.id || user._id,
                data: updatedData,
            }).unwrap();

            toast.success("Profile updated successfully!");
            localStorage.setItem("user", JSON.stringify(response.user));
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            toast.error(error?.data?.message || "Failed to update profile");
        }
    };

    return (
        <>
            {/* Profile Header & Image Upload */}
            <div className="-mx-6 -mt-6 mb-6 p-6 flex flex-col items-center border-b border-gray-100 bg-white">
                <div className="relative group flex flex-col items-center">
                    {/* Avatar Container */}
                    <div 
                        onClick={triggerImageUpload}
                        className="relative cursor-pointer group/avatar rounded-full p-1 transition-all duration-300 hover:scale-[1.02]"
                        title="Click to change profile picture"
                    >
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-orange-400 shadow-md ring-4 ring-orange-500/10 group-hover/avatar:ring-orange-500/30 transition-all duration-300">
                            <img
                                src={previewUrl || user?.profileImage || user?.avatar || profileImg}
                                alt="Profile"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                            />
                        </div>

                        {/* Floating Camera Badge */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerImageUpload();
                            }}
                            className="absolute bottom-1 right-1 bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full shadow-md transition-transform duration-200 hover:scale-110 active:scale-95"
                            title="Upload new photo"
                        >
                            <FiCamera className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Preview Selected Status */}
                    {previewUrl && (
                        <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md animate-fade-in">
                            <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>New photo selected</span>
                        </div>
                    )}
                </div>

                <p className="text-xs text-gray-500 mt-3 font-medium bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    {user?.email}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Hidden submit button */}
                <button type="submit" ref={saveButtonRef} className="hidden" />
                
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                />
                
                <div className="relative">
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder=" "
                        className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-orange-500 transition-all duration-200"
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
                        className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-orange-500 transition-all duration-200"
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
                        className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-orange-500 transition-all duration-200"
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
                            className="peer h-12 w-full border border-gray-300 px-3 rounded-md focus:outline-none focus:border-orange-500 transition-all duration-200"
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
            </form>

            {/* Security & Change Password Section */}
            <div className="border-t border-gray-200 pt-5 mt-5">
                <button
                    type="button"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="w-full flex items-center justify-between p-3.5 bg-orange-50/70 hover:bg-orange-50 border border-orange-200/80 rounded-xl transition-all cursor-pointer group shadow-2xs"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                            <FiLock className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-gray-800">Change Password</p>
                            <p className="text-[11px] text-gray-500">Update your account login password</p>
                        </div>
                    </div>
                    <div className="text-orange-600 group-hover:translate-y-0.5 transition-transform">
                        {showPasswordSection ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                    </div>
                </button>

                {showPasswordSection && (
                    <form onSubmit={handlePasswordSubmit} className="mt-3 p-4 bg-gray-50/80 border border-gray-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                        {/* Current Password */}
                        <div className="relative">
                            <input
                                type={showCurrentPass ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder=" "
                                className="peer h-11 w-full border border-gray-300 px-3 pr-10 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-500 transition-all"
                            />
                            <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${currentPassword ? 'text-xs -top-2 text-orange-600 font-semibold' : 'text-xs text-gray-400 top-3'}`}>
                                Current Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowCurrentPass(!showCurrentPass)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showCurrentPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>

                        {/* New Password */}
                        <div className="relative">
                            <input
                                type={showNewPass ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder=" "
                                className="peer h-11 w-full border border-gray-300 px-3 pr-10 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-500 transition-all"
                            />
                            <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${newPassword ? 'text-xs -top-2 text-orange-600 font-semibold' : 'text-xs text-gray-400 top-3'}`}>
                                New Password (min 6 chars)
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowNewPass(!showNewPass)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showNewPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>

                        {/* Confirm New Password */}
                        <div className="relative">
                            <input
                                type={showConfirmPass ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder=" "
                                className="peer h-11 w-full border border-gray-300 px-3 pr-10 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-500 transition-all"
                            />
                            <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${confirmPassword ? 'text-xs -top-2 text-orange-600 font-semibold' : 'text-xs text-gray-400 top-3'}`}>
                                Confirm New Password
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirmPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isChangingPassword}
                            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {isChangingPassword ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Updating Password...</span>
                                </>
                            ) : (
                                <>
                                    <FiKey size={14} />
                                    <span>Update Password</span>
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </>
    );
};

export default SettingsDrawerContent;
