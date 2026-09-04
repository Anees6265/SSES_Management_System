import { IoClose } from "react-icons/io5";
import { MdBusiness } from "react-icons/md";
import { toast } from "react-toastify";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import PropTypes from "prop-types";
import InputField from "../../../shared/form-fields/InputField";
import { useAddDepartmentMutation, useUpdateDepartmentMutation } from "../../../../redux/api/authApi";

const PRIMARY_COLOR = "#FDA92D";

const AddDepartmentModal = ({ isOpen, onClose, onSuccess, editData }) => {
  const [addDepartment] = useAddDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();

  const isEditMode = !!editData;

  const validationSchema = Yup.object({
    name: Yup.string().required("Department name is required"),
    universityName: Yup.string().required("University name is required"),
    headOfDepartment: Yup.string(),
    description: Yup.string(),
    isActive: Yup.boolean()
  });

  const initialValues = {
    name: editData?.name || "",
    universityName: editData?.universityName || "",
    headOfDepartment: editData?.headOfDepartment || "",
    description: editData?.description || "",
    allowedCourses: editData?.allowedCourses || [],
    isActive: editData?.isActive !== undefined ? editData.isActive : true
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const payload = {
        name: values.name,
        universityName: values.universityName,
        headOfDepartment: values.headOfDepartment,
        description: values.description,
        allowedCourses: values.allowedCourses,
        isActive: values.isActive
      };

      if (isEditMode) {
        const result = await updateDepartment({ id: editData._id, ...payload }).unwrap();
        toast.success(result.message || "Department updated successfully!");
      } else {
        const result = await addDepartment(payload).unwrap();
        toast.success(result.message || "Department added successfully!");
      }
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      const errorMessage = error?.data?.message || error?.message || "Error saving department. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-lg p-8 relative m-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <IoClose size={22} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
               style={{ backgroundColor: `${PRIMARY_COLOR}20` }}>
            <MdBusiness size={32} style={{ color: PRIMARY_COLOR }} />
          </div>
          <h2 className="text-2xl font-semibold" style={{ color: PRIMARY_COLOR }}>
            {isEditMode ? "Edit Department" : "Add New Department"}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {isEditMode ? "Update department information" : "Create a new department for your organization"}
          </p>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <InputField 
                label="Department Name" 
                name="name" 
                placeholder="Enter department name"
              />

              <InputField 
                label="University Name" 
                name="universityName" 
                placeholder="Enter university name"
              />

              <InputField 
                label="Head of Department" 
                name="headOfDepartment" 
                placeholder="Enter HOD name"
              />

              <InputField 
                label="Description" 
                name="description" 
                type="textarea"
                placeholder="Enter department description"
              />

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={values.isActive === true}
                    onChange={() => setFieldValue('isActive', true)}
                    className="w-4 h-4 text-[#FDA92D] focus:ring-[#FDA92D]"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isActive"
                    checked={values.isActive === false}
                    onChange={() => setFieldValue('isActive', false)}
                    className="w-4 h-4 text-[#FDA92D] focus:ring-[#FDA92D]"
                  />
                  <span className="text-sm text-gray-700">Inactive</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 h-12 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-md transition-colors disabled:opacity-50"
                  style={{ 
                    backgroundColor: PRIMARY_COLOR, 
                    color: 'white',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Department" : "Add Department")}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

AddDepartmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  editData: PropTypes.object
};

export default AddDepartmentModal;
