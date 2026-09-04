/* eslint-disable react/prop-types */
import { useState } from "react";
import { IoCloudUploadOutline, IoDocumentTextOutline } from "react-icons/io5";
import { useConfirmPlacementMutation } from "../../../redux/api/authApi";
import { toast } from "react-toastify";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../shared/form-fields/InputField";
import CustomDatePicker from "../students/CustomDatePicker";
import { buttonStyles } from "../../../styles/buttonStyles";
import OrangeButton from "../../shared/sidebar/OrangeButton";

const TEXT_COLOR = "#4B4B4B";

const ConfirmPlacementModal = ({ isOpen, onClose, student, onSuccess }) => {
  const [applicationFile, setApplicationFile] = useState(null);
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [confirmPlacement] = useConfirmPlacementMutation();

  const validationSchema = Yup.object({
    companyName: Yup.string().required("Company name is required"),
    salary: Yup.number().required("Salary is required").positive("Must be positive"),
    location: Yup.string().required("Location is required"),
    jobProfile: Yup.string().required("Job profile is required"),
    jobType: Yup.string().required("Job type is required"),
    joiningDate: Yup.string().required("Joining date is required")
  });

  const initialValues = {
    companyName: "",
    salary: "",
    location: "",
    jobProfile: "",
    jobType: "",
    joiningDate: ""
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    if (!applicationFile || !offerLetterFile) {
      toast.error("Please upload both Application and Offer Letter files");
      setSubmitting(false);
      return;
    }
    
    try {
      const placementData = new FormData();
      placementData.append('studentId', student?._id);
      placementData.append('companyName', values.companyName);
      placementData.append('salary', values.salary);
      placementData.append('location', values.location);
      placementData.append('jobProfile', values.jobProfile);
      placementData.append('jobType', values.jobType);
      placementData.append('joiningDate', values.joiningDate);
      placementData.append('applicationFile', applicationFile);
      placementData.append('offerLetterFile', offerLetterFile);
      
      await confirmPlacement(placementData).unwrap();
      
      toast.success("Placement confirmed successfully!");
      onSuccess?.();
      resetForm();
      setApplicationFile(null);
      setOfferLetterFile(null);
      onClose();
    } catch (error) {
      console.error("Error confirming placement:", error);
      toast.error(error?.data?.message || "Error confirming placement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setApplicationFile(null);
    setOfferLetterFile(null);
    onClose();
  };

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={handleClose}
      panelTitle="Confirm Placement"
      panelSubtitle={student ? `${student.firstName} ${student.lastName} (${student.email})` : "Enter student placement details"}
      showFooter={false}
      maxWidth="sm:max-w-xl"
      drawerContent={
        <div className="space-y-4 pt-2">
          {student && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
              <p className="text-gray-700">
                <span className="font-semibold">Student:</span> {student.firstName} {student.lastName}
              </p>
              <p className="text-gray-500">{student.email}</p>
            </div>
          )}

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, setFieldValue, values }) => (
              <Form className="grid grid-cols-1 gap-4 text-sm" style={{ color: TEXT_COLOR }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InputField label="Company Name" name="companyName" placeholder="Enter company name" />
                  <InputField label="Yearly Salary" name="salary" type="number" placeholder="Enter yearly salary" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InputField label="Location" name="location" placeholder="Enter location" />
                  <InputField label="Job Profile" name="jobProfile" placeholder="Enter job profile" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InputField 
                    label="Job Type" 
                    name="jobType" 
                    type="select"
                    options={[
                      { value: "Full-Time", label: "Full-Time" },
                      { value: "Part-Time", label: "Part-Time" },
                      { value: "Contract", label: "Contract" },
                      { value: "Internship", label: "Internship" }
                    ]}
                    placeholder="Select Job Type"
                  />

                  <div className="relative">
                    <CustomDatePicker
                      name="joiningDate"
                      value={values.joiningDate}
                      onChange={({ name, value }) => setFieldValue(name, value)}
                      allowFuture={true}
                    />
                    <label className="absolute left-3 -top-2 text-xs bg-white px-1 text-black">
                      Joining Date *
                    </label>
                  </div>
                </div>

                {/* Application Upload */}
                <div className="relative">
                  <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_COLOR }}>
                    Application Upload *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setApplicationFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      required
                      id="applicationFile"
                    />
                    <div className={`h-11 border-2 border-dashed rounded-xl flex items-center px-3 transition-colors ${
                      applicationFile 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-[#FDA92D] hover:bg-orange-50'
                    }`}>
                      <div className="flex items-center gap-2 w-full">
                        {applicationFile ? (
                          <>
                            <IoDocumentTextOutline className="text-green-500" size={18} />
                            <span className="text-xs text-green-700 truncate flex-1">
                              {applicationFile.name}
                            </span>
                            <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                              Selected
                            </span>
                          </>
                        ) : (
                          <>
                            <IoCloudUploadOutline className="text-gray-400" size={18} />
                            <span className="text-xs text-gray-500">
                              Choose application file or drag and drop
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Offer Letter Upload */}
                <div className="relative">
                  <label className="block text-xs font-semibold mb-1" style={{ color: TEXT_COLOR }}>
                    Offer Letter Upload *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setOfferLetterFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      required
                      id="offerLetterFile"
                    />
                    <div className={`h-11 border-2 border-dashed rounded-xl flex items-center px-3 transition-colors ${
                      offerLetterFile 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-[#FDA92D] hover:bg-orange-50'
                    }`}>
                      <div className="flex items-center gap-2 w-full">
                        {offerLetterFile ? (
                          <>
                            <IoDocumentTextOutline className="text-green-500" size={18} />
                            <span className="text-xs text-green-700 truncate flex-1">
                              {offerLetterFile.name}
                            </span>
                            <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded">
                              Selected
                            </span>
                          </>
                        ) : (
                          <>
                            <IoCloudUploadOutline className="text-gray-400" size={18} />
                            <span className="text-xs text-gray-500">
                              Choose offer letter file or drag and drop
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
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
                    {isSubmitting ? "Confirming..." : "Confirm Placement"}
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

export default ConfirmPlacementModal;