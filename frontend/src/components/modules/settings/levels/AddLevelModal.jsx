import { IoClose } from "react-icons/io5";
import { MdLayers } from "react-icons/md";
import { toast } from "react-toastify";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import { useAddLevelMutation, useUpdateLevelMutation } from "../../../../redux/api/authApi";

const PRIMARY_COLOR = "#FDA92D";

const AddLevelModal = ({ isOpen, onClose, onSuccess, subdepartmentId, editData }) => {
  const [addLevel] = useAddLevelMutation();
  const [updateLevel] = useUpdateLevelMutation();

  const isEditMode = !!editData;

  const validationSchema = Yup.object({
    name: Yup.string().required("Level name is required"),
    order: Yup.number().required("Order is required").positive("Must be positive"),
    isActive: Yup.boolean()
  });

  const initialValues = {
    name: editData?.name || "",
    order: editData?.order || "",
    isActive: editData?.isActive !== undefined ? editData.isActive : true
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    if (!subdepartmentId) {
      toast.error("Subdepartment is required");
      return;
    }

    try {
      const payload = {
        name: values.name,
        order: Number(values.order),
        subDepartmentId: subdepartmentId,
        isActive: values.isActive
      };

      if (isEditMode) {
        await updateLevel({ levelId: editData._id, ...payload }).unwrap();
        toast.success("Level updated successfully!");
      } else {
        await addLevel(payload).unwrap();
        toast.success("Level added successfully!");
      }
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error?.data?.message || "Error saving level");
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
            <MdLayers size={32} style={{ color: PRIMARY_COLOR }} />
          </div>
          <h2 className="text-2xl font-semibold" style={{ color: PRIMARY_COLOR }}>
            {isEditMode ? "Edit Level" : "Add Level"}
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
                label="Level Name" 
                name="name" 
                placeholder="Enter level name"
              />

              <InputField 
                label="Order" 
                name="order" 
                type="number"
                placeholder="Enter order number"
              />

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

export default AddLevelModal;
