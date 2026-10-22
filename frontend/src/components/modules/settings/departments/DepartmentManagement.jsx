import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { MdBusiness, MdOutlinePersonOutline, MdOutlineAddPhotoAlternate } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import { FiSearch, FiX } from "react-icons/fi";
import { useGetAllDepartmentsQuery, useDeleteDepartmentMutation, useAddDepartmentMutation, useUpdateDepartmentMutation } from "../../../../redux/api/authApi";
import Loader from "../../../shared/loader/Loader";
import { toast } from "react-toastify";
import { confirmToast } from "../../../../utils/confirmToast";
import { useNavigate } from "react-router-dom";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import Header from "../../../shared/sidebar/Header";
import CommonCard from "../CommonCard";
import EmptyState from "../../../shared/empty-state/EmptyState";
import AddStudentModal from "../../students/AddStudentModal";
import { UserPlus, Plus } from "lucide-react";

const UNIVERSITY_OPTIONS = [
  {
    value: "Samrat Vikramaditya Vishwavidyalaya, Ujjain",
    label: "Samrat Vikramaditya Vishwavidyalaya, Ujjain",
  },
  {
    value: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV), Bhopal",
    label: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV), Bhopal",
  },
];

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const { data: departmentsData, isLoading, refetch } = useGetAllDepartmentsQuery();
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [addDepartment] = useAddDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();
  const [editingDepartment, setEditingDepartment] = useState(null);
  const editDeptFormRef = useRef(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const { user, role: authRole } = useSelector((state) => state.auth || {});
  const role = (
    authRole ||
    user?.role ||
    localStorage.getItem("role") ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}")?.role;
      } catch {
        return "";
      }
    })() ||
    ""
  ).toLowerCase().trim();

  const canManageDepartment = role === "superadmin" || role === "admin";

  const [searchQuery, setSearchQuery] = useState("");

  const departments = [...(departmentsData?.data || [])].sort((a, b) => b.isActive - a.isActive);

  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      dept.name?.toLowerCase().includes(q) ||
      dept.code?.toLowerCase().includes(q) ||
      dept.universityName?.toLowerCase().includes(q) ||
      dept.headOfDepartment?.toLowerCase().includes(q)
    );
  });

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
    const courses = (values.allowedCourses || [])
      .filter(c => c.courseName && c.durationInYears)
      .map(c => ({ ...c, durationInYears: Number(c.durationInYears) }));
    fd.append("allowedCourses", JSON.stringify(courses));
    if (values.reportConfig) {
      fd.append("reportConfig", JSON.stringify(values.reportConfig));
    }
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

  const handleDelete = async (id, deptName) => {
    const dept = departments.find(d => d._id === id);
    const targetName = deptName || dept?.name || "this department";
    if (await confirmToast(`Are you sure you want to delete ${targetName}?`, {
      confirmButtonClass: "bg-red-500 hover:bg-red-600 text-white",
      title: "Delete Department",
      itemName: targetName
    })) {
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
      {canManageDepartment ? (
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
              actions={
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                  title="Centralized Student Entry & Excel Bulk Import"
                >
                  <UserPlus size={16} />
                  <span>Add / Import Students</span>
                </button>
              }
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
                        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition min-h-[100px]"
                        onClick={() => document.getElementById('add-logo-input').click()}
                      >
                        {values.logoPreview ? (
                          <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center">
                            <img src={values.logoPreview} alt="logo preview" className="h-16 sm:h-20 w-auto max-w-[220px] object-contain rounded-lg" />
                          </div>
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
                    <InputField
                      label="University Name"
                      name="universityName"
                      type="select"
                      placeholder="Select university"
                      options={UNIVERSITY_OPTIONS}
                    />
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
                      <button type="button" onClick={() => setFieldValue('allowedCourses', [...values.allowedCourses, { courseName: '', durationInYears: '' }])} className="text-sm font-semibold text-orange-500 hover:text-orange-600 inline-flex items-center gap-1 cursor-pointer">
                        <Plus size={15} />
                        <span>Add Course</span>
                      </button>
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
      ) : (
        <Header
          title="Department Management"
          breadcrumbs={[{ label: "Departments" }]}
          actions={
            <button
              type="button"
              onClick={() => setIsAddStudentModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              title="Centralized Student Entry & Excel Bulk Import"
            >
              <UserPlus size={16} />
              <span>Add / Import Students</span>
            </button>
          }
        />
      )}

      <div className="px-3 sm:px-6 mt-4 sm:mt-6 pb-8">
        {/* Search & Header Stats Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search departments by name, university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <FiX size={15} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-[11px] sm:text-xs font-bold text-gray-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 whitespace-nowrap">
              {filteredDepartments.length} {filteredDepartments.length === 1 ? "Department" : "Departments"}
            </span>
          </div>
        </div>

        {/* Departments Cards Grid or Empty State */}
        {filteredDepartments.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No Matching Departments" : "No Departments Found"}
            subtitle={
              searchQuery
                ? `No departments matched your search for "${searchQuery}". Try adjusting your keywords.`
                : "No academic departments are currently present. Use the 'Add Department' button above to create one."
            }
            actionText={searchQuery ? "Clear Search" : undefined}
            onAction={searchQuery ? () => setSearchQuery("") : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {filteredDepartments.map((dept) => (
              <CommonCard
                key={dept._id}
                icon={MdBusiness}
                title={dept.name}
                subtitle={dept.universityName}
                description={dept.description || ""}
                status={dept.isActive}
                logo={dept.logo}
                infoItems={[
                  { icon: <MdOutlinePersonOutline size={18} />, label: "HOD", value: dept.headOfDepartment || "Not assigned" },
                  { icon: <HiOutlineUserGroup size={18} />, label: "Students", value: dept.totalStudents ?? 0 },
                ]}
                onView={() => handleRowClick(dept)}
                onEdit={canManageDepartment ? () => setEditingDepartment(dept) : null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Department Drawer */}
      <OrangeButton
        isOpen={Boolean(editingDepartment)}
        onClose={() => setEditingDepartment(null)}
        panelTitle="Edit Department"
        panelSubtitle={editingDepartment ? `Editing: ${editingDepartment.name}` : ""}
        leftBtnText="Cancel"
        rightBtnText="Update Department"
        onLeftClick={() => setEditingDepartment(null)}
        onRightClick={() => editDeptFormRef.current?.submitForm()}
        drawerContent={
          editingDepartment && (
            <Formik
              innerRef={editDeptFormRef}
              initialValues={{
                name: editingDepartment.name || "",
                code: editingDepartment.code || "",
                description: editingDepartment.description || "",
                universityName: editingDepartment.universityName || "",
                headOfDepartment: editingDepartment.headOfDepartment || "",
                allowedCourses: editingDepartment.allowedCourses?.length
                  ? editingDepartment.allowedCourses
                  : [{ courseName: "", durationInYears: "" }],
                isActive: editingDepartment.isActive ?? true,
                logoFile: null,
                logoPreview: editingDepartment.logo || ""
              }}
              validationSchema={validationSchema}
              enableReinitialize
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const fd = buildFormData(values);
                  fd.append("code", values.code || "");
                  const result = await updateDepartment({ id: editingDepartment._id, _formData: fd }).unwrap();
                  toast.success(result.message || "Department updated successfully!");
                  resetForm();
                  setEditingDepartment(null);
                  refetch();
                } catch (error) {
                  toast.error(error?.data?.message || "Error updating department");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ values, setFieldValue }) => (
                <Form className="space-y-4">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Department Logo</label>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition min-h-[100px]"
                      onClick={() => document.getElementById(`edit-logo-${editingDepartment._id}`).click()}
                    >
                      {values.logoPreview ? (
                        <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center">
                          <img src={values.logoPreview} alt="logo preview" className="h-16 sm:h-20 w-auto max-w-[220px] object-contain rounded-lg" />
                        </div>
                      ) : (
                        <>
                          <MdOutlineAddPhotoAlternate size={36} className="text-gray-400 mb-1" />
                          <span className="text-xs text-gray-400">Click to upload logo</span>
                        </>
                      )}
                    </div>
                    <input
                      id={`edit-logo-${editingDepartment._id}`}
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
                  <InputField
                    label="University Name"
                    name="universityName"
                    type="select"
                    placeholder="Select university"
                    options={UNIVERSITY_OPTIONS}
                  />
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
                    <button type="button" onClick={() => setFieldValue('allowedCourses', [...values.allowedCourses, { courseName: '', durationInYears: '' }])} className="text-sm font-semibold text-orange-500 hover:text-orange-600 inline-flex items-center gap-1 cursor-pointer">
                      <Plus size={15} />
                      <span>Add Course</span>
                    </button>
                  </div>
                  <RadioGroup label="Status" name="isActive" required={false} />
                </Form>
              )}
            </Formik>
          )
        }
      />

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onStudentAdded={() => refetch()}
      />
    </>
  );
};

export default DepartmentManagement;