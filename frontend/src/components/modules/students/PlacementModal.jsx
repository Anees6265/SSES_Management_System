/* eslint-disable react/prop-types */
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../shared/form-fields/InputField";
import { useUpdatePlacementMutation } from "../../../redux/api/authApi";
import { toast } from "react-toastify";
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

              <div className="col-span-2 flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 rounded-xl font-medium transition disabled:opacity-50 ${buttonStyles.primary}`}
                >
                  {isSubmitting ? "Updating..." : "Update Placement"}
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