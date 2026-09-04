/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { useUpdateUserMutation } from "../../../redux/api/authApi";
import { toast } from "react-toastify";
import profileImg from "../../../assets/images/profile-img.png";
import FaceRegistration from "../../modules/face-auth/FaceRegistration";
import { FiCamera, FiCheck } from "react-icons/fi";

const SettingsDrawerContent = ({ user, saveButtonRef }) => {
    const [formData, setFormData] = useState({
        name: user?.name || "",
        position: user?.position || "",
        role: user?.role || "",
        department: user?.department || "",
        isActive: user?.isActive ?? true,
    });
    const [showFaceRegistration, setShowFaceRegistration] = useState(false);
    const [hasFaceRegistered, setHasFaceRegistered] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [profileImageBase64, setProfileImageBase64] = useState("");
    const fileInputRef = useRef(null);

    const [updateUser, { isLoading }] = useUpdateUserMutation();

    useEffect(() => {
        checkFaceRegistration();
    }, []);

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

        const updatedData = {
            ...(formData.name && { name: formData.name }),
            ...(formData.position && { position: formData.position }),
            ...(formData.role && { role: formData.role }),
            ...(formData.department && { department: formData.department }),
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
        </>
    );
};

export default SettingsDrawerContent;
