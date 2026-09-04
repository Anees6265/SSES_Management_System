import { MdClose } from "react-icons/md";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import { useAddSubLevelMutation, useUpdateSubLevelMutation } from "../../../../redux/api/authApi";
import { toast } from "react-toastify";

const AddSubLevelModal = ({ isOpen, onClose, onSuccess, levelId, editData }) => {
  const [addSubLevel] = useAddSubLevelMutation();
  const [updateSubLevel] = useUpdateSubLevelMutation();

  const isEditMode = !!editData;

  const validationSchema = Yup.object({
    name: Yup.string().required("SubLevel name is required"),
    order: Yup.number().required("Order is required").positive("Must be positive"),
    isActive: Yup.boolean()
  });

  const initialValues = {
    name: editData?.name || "",
    order: editData?.order || "",
    isActive: editData?.isActive !== undefined ? editData.isActive : true
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const payload = {
        name: values.name,
        order: Number(values.order),
        levelId,
        isActive: values.isActive
      };

      if (editData) {
        await updateSubLevel({ subLevelId: editData._id, ...payload }).unwrap();
        toast.success("SubLevel updated successfully!");
      } else {
        await addSubLevel(payload).unwrap();
        toast.success("SubLevel added successfully!");
      }
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error(error?.data?.message || "Error saving sublevel");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{isEditMode ? "Edit SubLevel" : "Add SubLevel"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <MdClose size={24} />
          </button>
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
                label="SubLevel Name" 
                name="name" 
                placeholder="Enter sublevel name"
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
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={values.isActive === false}
                    onChange={() => setFieldValue('isActive', false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Inactive</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
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

export default AddSubLevelModal;
