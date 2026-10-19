/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { FaCalendarAlt, FaTimes } from "react-icons/fa";
import { useAddPlacementInterviewRecordMutation } from "../../../redux/api/authApi";
import OrangeButton from "../../shared/sidebar/OrangeButton";

const inputClass = "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none";

const ScheduleInterviewModal = ({ isOpen, onClose, studentId, onSuccess }) => {
  const [addInterviewRecord, { isLoading }] = useAddPlacementInterviewRecordMutation();

  const formik = useFormik({
    initialValues: {
      companyName: "",
      hrEmail: "",
      hrContact: "",
      location: "",
      jobProfile: "",
      scheduleDate: "",
    },
    validationSchema: Yup.object({
      companyName: Yup.string().trim().required("Company name is required"),
      hrEmail: Yup.string().trim().email("Invalid email").required("HR email is required"),
      hrContact: Yup.string().trim().matches(/^[0-9]{10}$/, "Enter 10 digit contact").required("HR contact is required"),
      location: Yup.string().trim().required("Location is required"),
      jobProfile: Yup.string().trim().required("Job profile is required"),
      scheduleDate: Yup.string().required("Date and time is required"),
    }),
    onSubmit: async (values, actions) => {
      try {
        if (!studentId) {
          toast.error("Student ID missing");
          return;
        }

        await addInterviewRecord({
          studentId,
          interviewData: {
            companyName: values.companyName.trim(),
            hrEmail: values.hrEmail.trim(),
            hrContact: values.hrContact.trim(),
            location: values.location.trim(),
            jobProfile: values.jobProfile.trim(),
            scheduleDate: new Date(values.scheduleDate).toISOString(),
          },
        }).unwrap();

        toast.success("Interview scheduled successfully");
        actions.resetForm();
        onClose();
        onSuccess?.();
      } catch (error) {
        toast.error(error?.data?.message || error?.data?.error || "Failed to schedule interview");
      }
    },
  });

  useEffect(() => {
    if (!isOpen) formik.resetForm();
  }, [isOpen]);

  const field = (name, placeholder, type = "text") => (
    <div>
      <input
        {...formik.getFieldProps(name)}
        type={type}
        placeholder={placeholder}
        className={inputClass}
      />
      {formik.touched[name] && formik.errors[name] && (
        <p className="mt-1 text-xs text-red-500">{formik.errors[name]}</p>
      )}
    </div>
  );

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onClose}
      panelTitle="Company Interview Details"
      panelSubtitle="Schedule an interview for the selected candidate"
      showFooter={false}
      drawerContent={
        <form onSubmit={formik.handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3">
            {field("companyName", "Company Name")}
            {field("hrEmail", "HR Email", "email")}
            {field("hrContact", "HR Contact", "tel")}
            {field("location", "Location")}
            {field("jobProfile", "Job Profile")}

            <div className="relative">
              <input
                {...formik.getFieldProps("scheduleDate")}
                type="datetime-local"
                className={`${inputClass} pr-10 ${formik.values.scheduleDate ? "" : "text-gray-400"}`}
              />
              <FaCalendarAlt className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              {formik.touched.scheduleDate && formik.errors.scheduleDate && (
                <p className="mt-1 text-xs text-red-500">{formik.errors.scheduleDate}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-2 sm:py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center text-center"
            >
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold tracking-wider uppercase text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-center"
            >
              <FaCalendarAlt size={14} />
              <span>{isLoading ? "Submitting..." : "Schedule Interview"}</span>
            </button>
          </div>
        </form>
      }
    />
  );
};

export default ScheduleInterviewModal;
