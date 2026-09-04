/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useUpdateTechnologyMutation } from "../../../redux/api/authApi";
import CustomDropdown from "../../shared/form-fields/CustomDropdown";
import { buttonStyles } from "../../../styles/buttonStyles";
import OrangeButton from "../../shared/sidebar/OrangeButton";

const UpdateTechnologyModal = ({ isOpen, onClose, studentId }) => {
    const [updateTechnology, { isLoading }] = useUpdateTechnologyMutation();
    const [showCustomInput, setShowCustomInput] = useState(false);

    const techOptions = [
        { value: "Python (AI/ML)", label: "Python (AI/ML)" },
        { value: "UI/UX Design", label: "UI/UX Design" },
        { value: "Mern Developer", label: "Mern Developer" },
        { value: "Full Stack Developer", label: "Full Stack Developer" },
        { value: "DevOps Engineer", label: "DevOps Engineer" },
        { value: "Digital Marketing", label: "Digital Marketing" },
        { value: "Others", label: "Others" }
    ];

    const techSchema = Yup.object().shape({
        techno: Yup.string().required("Technology is required"),
        customTechno: Yup.string().when('techno', {
            is: 'Others',
            then: (schema) => schema.required("Please specify the technology"),
            otherwise: (schema) => schema.notRequired()
        })
    });

    const initialValues = {
        techno: "",
        customTechno: ""
    };

    const handleSubmit = async (values, actions) => {
        try {
            if (!studentId) {
                toast.error("Student ID missing!");
                return;
            }

            const finalTechno = values.techno === "Others" ? values.customTechno : values.techno;
            await updateTechnology({ id: studentId, techno: finalTechno }).unwrap();
            toast.success("Technology updated successfully!");
            actions.resetForm();
            setShowCustomInput(false);
            onClose();
        } catch (err) {
            console.error("Error updating technology", err);
            toast.error(err?.data?.message || "Update failed");
        }
    };

    const handleClose = () => {
        setShowCustomInput(false);
        onClose();
    };

    return (
        <OrangeButton
            isOpen={isOpen}
            onClose={handleClose}
            panelTitle="Update Technology"
            panelSubtitle="Select primary technology stream"
            showFooter={false}
            drawerContent={
                <TechnologyForm
                    initialValues={initialValues}
                    techSchema={techSchema}
                    handleSubmit={handleSubmit}
                    techOptions={techOptions}
                    showCustomInput={showCustomInput}
                    setShowCustomInput={setShowCustomInput}
                    isLoading={isLoading}
                    onClose={handleClose}
                />
            }
        />
    );
};

const TechnologyForm = ({ initialValues, techSchema, handleSubmit, techOptions, showCustomInput, setShowCustomInput, isLoading, onClose }) => {
    return (
        <Formik
            initialValues={initialValues}
            validationSchema={techSchema}
            onSubmit={handleSubmit}
        >
            {({ values, handleChange, touched, errors, setFieldValue }) => {
                useEffect(() => {
                    setShowCustomInput(values.techno === "Others");
                    if (values.techno !== "Others") {
                        setFieldValue('customTechno', "");
                    }
                }, [values.techno, setFieldValue, setShowCustomInput]);

                return (
                    <Form className="pt-2">
                        <div className="grid grid-cols-1 gap-4">
                            <CustomDropdown
                                name="techno"
                                label="Technology"
                                options={techOptions}
                            />

                            {showCustomInput && (
                                <div className="relative w-full">
                                    <input
                                        type="text"
                                        name="customTechno"
                                        value={values.customTechno}
                                        onChange={handleChange}
                                        className="peer h-12 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition"
                                        placeholder="Enter technology name..."
                                    />
                                    <label className="absolute left-3 bg-white px-1 text-xs -top-2 text-gray-700">
                                        Custom Technology
                                    </label>
                                    {touched.customTechno && errors.customTechno && (
                                        <p className="text-xs text-red-500 mt-1">{errors.customTechno}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`flex-1 py-3 rounded-xl font-medium transition disabled:opacity-50 ${buttonStyles.primary}`}
                                >
                                    {isLoading ? "Updating..." : "Update Technology"}
                                </button>
                            </div>
                        </div>
                    </Form>
                );
            }}
        </Formik>
    );
};

export default UpdateTechnologyModal;
