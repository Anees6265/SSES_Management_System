/* eslint-disable react/prop-types */
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../shared/form-fields/InputField";
import { useUpdatePlacementMutation } from "../../../redux/api/authApi";
import { toast } from "react-toastify";
import { MdClose, MdCheck } from "react-icons/md";
import { buttonStyles } from "../../../styles/buttonStyles";
import OrangeButton from "../../shared/sidebar/OrangeButton";

const PlacementModal = ({ isOpen, onClose, studentId }) => {
  const [updatePlacement] = useUpdatePlacementMutation();

  const validationSchema = Yup.object({
    companyName: Yup.string().required("Company name is required"),
    salary: Yup.string().required("Salary is required"),
    location: Yup.string().required("Location is required"),
    jobProfile: Yup.string().required("Job profile is required")
  });

  const initialValues = {
    companyName: "",
    salary: "",
    location: "",
    jobProfile: ""
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await updatePlacement({ id: studentId, data: values }).unwrap();
      toast.success("Placement updated successfully");
      resetForm();
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update placement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onClose}
      panelTitle="Update Placement Info"
      panelSubtitle="Enter company, job profile, and salary details"
      showFooter={false}
      drawerContent={
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="col-span-2 md:col-span-1">
                <InputField label="Company Name" name="companyName" placeholder="Enter company name" />
              </div>

              <div className="col-span-2 md:col-span-1">
                <InputField label="Job Profile" name="jobProfile" placeholder="Enter job profile" />
              </div>

              <div className="col-span-2 md:col-span-1">
                <InputField label="Salary" name="salary" placeholder="Enter salary" />
              </div>

              <div className="col-span-2 md:col-span-1">
                <InputField label="Location" name="location" placeholder="Enter location" />
              </div>

              <div className="col-span-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2 sm:py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center text-center"
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-5 py-2 sm:py-2.5 rounded-xl font-bold tracking-wider uppercase text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 text-center ${buttonStyles.primary}`}
                >
                  <MdCheck size={16} />
                  <span>{isSubmitting ? "Updating..." : "Update Placement"}</span>
                </button>
              </div>
            </Form>
          )}
        </Formik>
      }
    />
  );
};

export default PlacementModal;