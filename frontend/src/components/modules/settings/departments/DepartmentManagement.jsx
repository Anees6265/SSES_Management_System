import { useState } from "react";
import { MdBusiness, MdOutlinePersonOutline, MdOutlineAddPhotoAlternate } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import { useGetAllDepartmentsQuery, useDeleteDepartmentMutation, useAddDepartmentMutation, useUpdateDepartmentMutation } from "../../../../redux/api/authApi";
import Loader from "../../../shared/loader/Loader";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import Header from "../../../shared/sidebar/Header";
import CommonCard from "../CommonCard";

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const { data: departmentsData, isLoading, refetch } = useGetAllDepartmentsQuery();
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [addDepartment] = useAddDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();
  const [editingDepartment, setEditingDepartment] = useState(null);

  const departments = [...(departmentsData?.data || [])].sort((a, b) => b.isActive - a.isActive);

  const validationSchema = Yup.object({
    name: Yup.string().required("Department name is required"),
    description: Yup.string(),
    universityName: Yup.string().required("University name is required"),
    headOfDepartment: Yup.string(),
    allowedCourses: Yup.array().of(
      Yup.object({
        courseName: Yup.string().required("Course name is required"),
        durationInYears: Yup.number().required("Duration is required").positive("Must be positive")
      })
    ),
    isActive: Yup.boolean()
  });

  const buildFormData = (values) => {
    const fd = new FormData();
    fd.append("name", values.name);
    fd.append("description", values.description || "");
    fd.append("universityName", values.universityName);
    fd.append("headOfDepartment", values.headOfDepartment || "");
    fd.append("isActive", values.isActive);
    const courses = values.allowedCourses
      .filter(c => c.courseName && c.durationInYears)
      .map(c => ({ ...c, durationInYears: Number(c.durationInYears) }));
    fd.append("allowedCourses", JSON.stringify(courses));
    if (values.logoFile) fd.append("logo", values.logoFile);
    return fd;
  };

  const handleDepartmentSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const fd = buildFormData(values);

      if (editingDepartment) {
        const result = await updateDepartment({ id: editingDepartment._id, _formData: fd }).unwrap();
        toast.success(result.message || "Department updated successfully!");
      } else {
        const result = await addDepartment(fd).unwrap();
        toast.success(result.message || "Department added successfully!");
      }
      resetForm();
      setEditingDepartment(null);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || error?.message || "Error saving department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        await deleteDepartment(id).unwrap();
        toast.success("Department deleted successfully!");
        refetch();
      } catch (error) {
        toast.error(error?.data?.message || "Error deleting department");
      }
    }
  };

  const handleRowClick = (department) => {
    navigate(`/department-details/${department._id}`, { state: { department } });
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <Formik
              key={editingDepartment?._id || 'new'}
              initialValues={{
                name: editingDepartment?.name || "",
                description: editingDepartment?.description || "",
                universityName: editingDepartment?.universityName || "",
                headOfDepartment: editingDepartment?.headOfDepartment || "",
                allowedCourses: editingDepartment?.allowedCourses || [{ courseName: "", durationInYears: "" }],
                isActive: editingDepartment?.isActive !== undefined ? editingDepartment.isActive : true,
                logoFile: null,
                logoPreview: editingDepartment?.logo || ""
              }}
              validationSchema={validationSchema}
              onSubmit={handleDepartmentSubmit}
              enableReinitialize
            >
              {({ values, setFieldValue, isSubmitting, submitForm, resetForm }) => (
                <Header
                  title="Department Management"
                  breadcrumbs={[{ label: "Departments" }]}
                >
                  <OrangeButton
                    buttonTitle="Add Department"
                  panelTitle={editingDepartment ? "Edit Department" : "Add New Department"}
                  drawerContent={
                    <Form className="space-y-4">
                      {/* Logo Upload */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Department Logo</label>
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition"
                          onClick={() => document.getElementById('add-logo-input').click()}
                        >
                          {values.logoPreview ? (
                            <img src={values.logoPreview} alt="logo preview" className="h-20 w-20 object-contain rounded-lg" />
                          ) : (
                            <>
                              <MdOutlineAddPhotoAlternate size={36} className="text-gray-400 mb-1" />
                              <span className="text-xs text-gray-400">Click to upload logo</span>
                            </>
                          )}
                        </div>
                        <input
                          id="add-logo-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setFieldValue("logoFile", file);
                              setFieldValue("logoPreview", URL.createObjectURL(file));
                            }
                          }}
                        />
                      </div>

                      <InputField label="Department Name" name="name" placeholder="Enter department name" />
                      <InputField label="Description" name="description" type="textarea" placeholder="Enter description" />
                      <InputField label="University Name" name="universityName" placeholder="Enter university name" />
                      <InputField label="Head of Department" name="headOfDepartment" placeholder="Enter HOD name" />

                      <div>
                        <label className="block text-sm font-medium mb-2">Allowed Courses</label>
                        {values.allowedCourses.map((course, index) => (
                          <div key={index} className="flex gap-2 mb-2">
                            <Field name={`allowedCourses.${index}.courseName`} placeholder="Course name" className="flex-1 border rounded px-3 py-2" />
                            <Field name={`allowedCourses.${index}.durationInYears`} type="number" placeholder="Years" className="w-24 border rounded px-3 py-2" />
                            {values.allowedCourses.length > 1 && (
                              <button type="button" onClick={() => setFieldValue('allowedCourses', values.allowedCourses.filter((_, i) => i !== index))} className="px-3 py-2 bg-red-500 text-white rounded">✕</button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => setFieldValue('allowedCourses', [...values.allowedCourses, { courseName: '', durationInYears: '' }])} className="text-sm text-orange-500 hover:text-orange-600">+ Add Course</button>
                      </div>

                      <RadioGroup label="Status" name="isActive" required={false} />
                    </Form>
                  }
                  leftBtnText="Cancel"
                  rightBtnText={isSubmitting ? "Saving..." : (editingDepartment ? "Update Department" : "Add Department")}
                  onLeftClick={() => {
                    resetForm();
                    setEditingDepartment(null);
                  }}
                  onRightClick={submitForm}
                />
                </Header>
              )}
            </Formik>

      <div className="px-6 mt-6">
        {/* Departments Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <Formik
                key={dept._id}
                initialValues={{
                  name: dept.name,
                  code: dept.code,
                  description: dept.description || "",
                  universityName: dept.universityName,
                  headOfDepartment: dept.headOfDepartment || "",
                  allowedCourses: dept.allowedCourses || [{ courseName: "", durationInYears: "" }],
                  isActive: dept.isActive,
                  logoFile: null,
                  logoPreview: dept.logo || ""
                }}
                validationSchema={validationSchema}
                onSubmit={async (values, { setSubmitting, resetForm }) => {
                  try {
                    const fd = buildFormData(values);
                    fd.append("code", values.code || "");
                    const result = await updateDepartment({ id: dept._id, _formData: fd }).unwrap();
                    toast.success(result.message || "Department updated successfully!");
                    resetForm();
                    refetch();
                  } catch (error) {
                    toast.error(error?.data?.message || "Error updating department");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                enableReinitialize
              >
                {({ isSubmitting, submitForm, resetForm, values, setFieldValue }) => (
                  <CommonCard
                    icon={MdBusiness}
                    title={dept.name}
                    description={dept.description || dept.universityName || "No description"}
                    status={dept.isActive}
                    logo={dept.logo}
                    infoItems={[
                      { icon: <MdOutlinePersonOutline size={18} />, label: "HOD", value: dept.headOfDepartment || "Not assigned" },
                      { icon: <HiOutlineUserGroup size={18} />, label: "Students", value: dept.totalStudents ?? 0 },
                    ]}
                    onView={() => handleRowClick(dept)}
                    onEdit={
                      <OrangeButton
                        buttonTitle="EDIT"
                        panelTitle="Edit Department"
                        customButtonClass="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-orange-600 transition"
                        drawerContent={
                          <Form className="space-y-4">
                            {/* Logo Upload */}
                            <div>
                              <label className="block text-sm font-medium mb-2">Department Logo</label>
                              <div
                                className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition"
                                onClick={() => document.getElementById(`edit-logo-${dept._id}`).click()}
                              >
                                {values.logoPreview ? (
                                  <img src={values.logoPreview} alt="logo preview" className="h-20 w-20 object-contain rounded-lg" />
                                ) : (
                                  <>
                                    <MdOutlineAddPhotoAlternate size={36} className="text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-400">Click to upload logo</span>
                                  </>
                                )}
                              </div>
                              <input
                                id={`edit-logo-${dept._id}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setFieldValue("logoFile", file);
                                    setFieldValue("logoPreview", URL.createObjectURL(file));
                                  }
                                }}
                              />
                            </div>
                            <InputField label="Department Name" name="name" placeholder="Enter department name" />
                            <InputField label="Department Code" name="code" placeholder="Enter department code" disabled={true} />
                            <InputField label="Description" name="description" type="textarea" placeholder="Enter description" />
                            <InputField label="University Name" name="universityName" placeholder="Enter university name" />
                            <InputField label="Head of Department" name="headOfDepartment" placeholder="Enter HOD name" />
                            <div>
                              <label className="block text-sm font-medium mb-2">Allowed Courses</label>
                              {values.allowedCourses.map((course, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                  <Field name={`allowedCourses.${index}.courseName`} placeholder="Course name" className="flex-1 border rounded px-3 py-2" />
                                  <Field name={`allowedCourses.${index}.durationInYears`} type="number" placeholder="Years" className="w-24 border rounded px-3 py-2" />
                                  {values.allowedCourses.length > 1 && (
                                    <button type="button" onClick={() => setFieldValue('allowedCourses', values.allowedCourses.filter((_, i) => i !== index))} className="px-3 py-2 bg-red-500 text-white rounded">✕</button>
                                  )}
                                </div>
                              ))}
                              <button type="button" onClick={() => setFieldValue('allowedCourses', [...values.allowedCourses, { courseName: '', durationInYears: '' }])} className="text-sm text-orange-500 hover:text-orange-600">+ Add Course</button>
                            </div>
                            <RadioGroup label="Status" name="isActive" required={false} />
                          </Form>
                        }
                        leftBtnText="Cancel"
                        rightBtnText={isSubmitting ? "Updating..." : "Update Department"}
                        onLeftClick={resetForm}
                        onRightClick={submitForm}
                      />
                    }
                  />
                )}
              </Formik>
            ))}
        </div>
      </div>
    </>
  );
};

export default DepartmentManagement;