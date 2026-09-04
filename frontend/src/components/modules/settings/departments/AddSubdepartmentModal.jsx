import PropTypes from "prop-types";
import { IoClose } from "react-icons/io5";
import { MdAccountTree } from "react-icons/md";
import { toast } from "react-toastify";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import { useAddSubdepartmentMutation, useUpdateSubdepartmentMutation } from "../../../../redux/api/authApi";

const PRIMARY_COLOR = "#FDA92D";

const AddSubdepartmentModal = ({ isOpen, onClose, onSuccess, departmentId, editData }) => {
  const [addSubdepartment] = useAddSubdepartmentMutation();
  const [updateSubdepartment] = useUpdateSubdepartmentMutation();

  const isEditMode = !!editData;

  const validationSchema = Yup.object({
    name: Yup.string().required("Subdepartment name is required"),
    allowedCourses: Yup.array().of(Yup.string()),
    isActive: Yup.boolean()
  });

  const initialValues = {
    name: editData?.name || "",
    allowedCourses: editData?.allowedCourses || [],
    isActive: editData?.isActive !== undefined ? editData.isActive : true
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const payload = {
        name: values.name,
        departmentId,
        allowedCourses: values.allowedCourses.filter(c => c),
        isActive: values.isActive
      };

      if (isEditMode) {
        await updateSubdepartment({ 
          subdepartmentId: editData._id, 
          ...payload 
        }).unwrap();
        toast.success("Subdepartment updated successfully!");
      } else {
        await addSubdepartment(payload).unwrap();
        toast.success("Subdepartment added successfully!");
      }
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error?.data?.message || "Error saving subdepartment");
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
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <IoClose size={22} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
               style={{ backgroundColor: `${PRIMARY_COLOR}20` }}>
            <MdAccountTree size={32} style={{ color: PRIMARY_COLOR }} />
          </div>
          <h2 className="text-2xl font-semibold" style={{ color: PRIMARY_COLOR }}>
            {isEditMode ? "Edit Subdepartment" : "Add Subdepartment"}
          </h2>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4">
              <InputField 
                label="Subdepartment Name" 
                name="name" 
                placeholder="Enter subdepartment name"
              />

              <div>
                <label className="block text-sm font-medium mb-2">Allowed Courses</label>
                {values.allowedCourses.map((course, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      value={course}
                      onChange={(e) => {
                        const newCourses = [...values.allowedCourses];
                        newCourses[index] = e.target.value;
                        setFieldValue('allowedCourses', newCourses);
                      }}
                      placeholder="Course name"
                      className="flex-1 border rounded px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newCourses = values.allowedCourses.filter((_, i) => i !== index);
                        setFieldValue('allowedCourses', newCourses);
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFieldValue('allowedCourses', [...values.allowedCourses, ''])}
                  className="text-sm text-orange-500 hover:text-orange-600"
                >
                  + Add Course
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={values.isActive === true}
                    onChange={() => setFieldValue('isActive', true)}
                    className="w-4 h-4 text-[#FDA92D] focus:ring-[#FDA92D]"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
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
                  className="flex-1 h-12 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-md disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
                >
                  {isSubmitting ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update" : "Add")}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

AddSubdepartmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  departmentId: PropTypes.string.isRequired,
  editData: PropTypes.object
};

export default AddSubdepartmentModal;
