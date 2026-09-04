/* eslint-disable react/prop-types */
import { useState } from "react";
import { IoCloudUploadOutline, IoDocumentTextOutline } from "react-icons/io5";
import { toast } from "react-toastify";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../shared/form-fields/InputField";
import { useCreatePlacementPostMutation, useUpdatePlacementPostMutation, useGetCompanyByNameQuery } from "../../../redux/api/authApi";
import { buttonStyles } from "../../../styles/buttonStyles";
import OrangeButton from "../../shared/sidebar/OrangeButton";

const TEXT_COLOR = "#4B4B4B";

const CreatePostModal = ({ isOpen, onClose, student, onSuccess, isUpdateMode = false }) => {
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [studentImageFile, setStudentImageFile] = useState(null);
  const [createPlacementPost] = useCreatePlacementPostMutation();
  const [updatePlacementPost] = useUpdatePlacementPostMutation();

  const companyName = student?.placedInfo?.companyName;

  const { data: companyData } = useGetCompanyByNameQuery(companyName, {
    skip: !companyName || !isOpen,
  });
  const existingCompanyLogo = companyData?.data?.companyLogo || "";
  const existingStudentImage = student?.image || "";

  const validationSchema = Yup.object({
    position: Yup.string().required("Position is required"),
    companyName: Yup.string().required("Company name is required"),
    headOffice: Yup.string().required("Head office is required")
  });

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const studentId = student?._id;
      if (!studentId) {
        toast.error("Student ID missing");
        setSubmitting(false);
        return;
      }

      const postData = {
        studentId,
        position: values.position,
        companyName: values.companyName,
        headOffice: values.headOffice,
        location: values.headOffice,
      };

      postData.companyLogo = companyLogoFile
        ? await fileToBase64(companyLogoFile)
        : existingCompanyLogo;

      postData.studentImage = studentImageFile
        ? await fileToBase64(studentImageFile)
        : existingStudentImage;

      if (!postData.companyLogo) {
        toast.error("Company logo is required");
        setSubmitting(false);
        return;
      }
      if (!postData.studentImage) {
        toast.error("Student image is required");
        setSubmitting(false);
        return;
      }

      if (isUpdateMode) {
        await updatePlacementPost({ studentId, ...postData }).unwrap();
        toast.success("Placement post updated successfully!");
      } else {
        await createPlacementPost(postData).unwrap();
        toast.success("Placement post created successfully!");
      }

      onSuccess?.();
      resetForm();
      setCompanyLogoFile(null);
      setStudentImageFile(null);
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.error || `Failed to ${isUpdateMode ? 'update' : 'create'} placement post`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCompanyLogoFile(null);
    setStudentImageFile(null);
    onClose();
  };

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={handleClose}
      panelTitle={isUpdateMode ? "Update Placement Post" : "Create Placement Post"}
      panelSubtitle={student ? `${student.firstName} ${student.lastName} (${student.course || ''})` : "Configure placement post announcement"}
      showFooter={false}
      maxWidth="sm:max-w-xl"
      drawerContent={
        <div className="space-y-4 pt-2">
          {student && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
              <p className="text-gray-700">
                <span className="font-semibold">Student:</span> {student.firstName} {student.lastName}
              </p>
              <p className="text-gray-500">Course: {student.course}</p>
            </div>
          )}

          <Formik
            initialValues={{
              position: student?.placedInfo?.jobProfile || "",
              companyName: student?.placedInfo?.companyName || "",
              headOffice: student?.placedInfo?.location || ""
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ isSubmitting }) => (
              <Form className="grid grid-cols-1 gap-4 text-sm" style={{ color: TEXT_COLOR }}>
                <InputField label="Position" name="position" placeholder="Enter position" />
                <InputField label="Company Name" name="companyName" placeholder="Enter company name" />
                <InputField label="Head Office" name="headOffice" placeholder="Enter head office location" />

                {/* Company Logo */}
                <ImageUploadField
                  label="Company Logo"
                  file={companyLogoFile}
                  existingUrl={existingCompanyLogo}
                  onChange={(e) => setCompanyLogoFile(e.target.files[0])}
                  onClear={() => setCompanyLogoFile(null)}
                />

                {/* Student Image */}
                <ImageUploadField
                  label="Student Image"
                  file={studentImageFile}
                  existingUrl={existingStudentImage}
                  onChange={(e) => setStudentImageFile(e.target.files[0])}
                  onClear={() => setStudentImageFile(null)}
                />

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-3 font-medium rounded-xl ${buttonStyles.primary}`}
                  >
                    {isSubmitting
                      ? isUpdateMode ? "Updating..." : "Creating..."
                      : isUpdateMode ? "Update Post" : "Create Post"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      }
    />
  );
};

const ImageUploadField = ({ label, file, existingUrl, onChange, onClear }) => {
  const previewSrc = file ? URL.createObjectURL(file) : existingUrl;
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: "#4B4B4B" }}>{label}</label>
      {previewSrc && (
        <div className="mb-2 flex items-center gap-3">
          <img src={previewSrc} alt={label} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
          <span className="text-xs text-gray-500">
            {file ? "New image selected" : "Current image (click to replace)"}
          </span>
          {file && (
            <button type="button" onClick={onClear} className="text-xs text-red-500 hover:underline">Remove</button>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className={`h-11 border-2 border-dashed rounded-xl flex items-center px-3 transition-colors ${
          file ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-[#FDA92D] hover:bg-orange-50"
        }`}>
          <div className="flex items-center gap-2 w-full">
            {file ? (
              <>
                <IoDocumentTextOutline className="text-green-500" size={18} />
                <span className="text-xs text-green-700 truncate flex-1">{file.name}</span>
                <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">Selected</span>
              </>
            ) : (
              <>
                <IoCloudUploadOutline className="text-gray-400" size={18} />
                <span className="text-xs text-gray-500">
                  {existingUrl ? "Click to replace image" : "Choose image or drag and drop"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;