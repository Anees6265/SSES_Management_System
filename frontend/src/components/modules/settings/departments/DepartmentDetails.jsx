import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import Header from "../../../shared/sidebar/Header";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  useGetSubdepartmentsByDepartmentQuery,
  useGetAllDepartmentsQuery,
  useAddSubdepartmentMutation,
  useUpdateSubdepartmentMutation,
} from "../../../../redux/api/authApi";
import { toast } from "react-toastify";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import SubDepartmentCard from "./SubDepartmentCard";
import { MdAccountTree } from "react-icons/md";
import Loader from "../../../shared/loader/Loader";
import EmptyState from "../../../shared/empty-state/EmptyState";
import { Plus } from "lucide-react";

const DepartmentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: departmentIdParam } = useParams();
  const [editingSubdept, setEditingSubdept] = useState(null);
  const [isAddSubdeptOpen, setIsAddSubdeptOpen] = useState(false);
  const addSubdeptFormRef = useRef(null);
  const editSubdeptFormRef = useRef(null);

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

  const canManage = role === "superadmin" || role === "admin";

  const stateDept = location.state?.department;
  const { data: allDepartmentsData, isLoading: isDeptsLoading } = useGetAllDepartmentsQuery(undefined, {
    skip: Boolean(stateDept?._id),
  });

  const department = stateDept || (allDepartmentsData?.data || []).find((d) => d._id === departmentIdParam);
  const activeDepartmentId = department?._id || departmentIdParam || "";

  // Extract course names from department's allowedCourses for subdept dropdown
  const departmentCourses = (department?.allowedCourses || []).map((c) => c.courseName).filter(Boolean);

  const {
    data: subdepartmentsData,
    isLoading: isSubdeptsLoading,
    refetch,
  } = useGetSubdepartmentsByDepartmentQuery(activeDepartmentId, {
    skip: !activeDepartmentId,
  });

  const [addSubdepartment, { isLoading: isAddingSubdept }] = useAddSubdepartmentMutation();
  const [updateSubdepartment, { isLoading: isUpdatingSubdept }] = useUpdateSubdepartmentMutation();

  const subdepartments = [...(subdepartmentsData?.data || [])].sort((a, b) => b.isActive - a.isActive);

  const validationSchema = Yup.object({
    name: Yup.string().trim().required("Subdepartment name is required"),
    departmentId: Yup.string().nullable(),
    allowedCourses: Yup.array().of(Yup.string()).nullable(),
    isActive: Yup.boolean(),
  });

  const handleViewSubdept = (subdept) => {
    navigate(`/subdepartment/${subdept._id}/levels`, {
      state: { departmentId: activeDepartmentId, subdepartment: subdept, departmentName: department?.name },
    });
  };

  const handleEditSubdept = (subdept) => {
    if (!canManage) return null;
    return () => setEditingSubdept(subdept);
  };

  if (isDeptsLoading || isSubdeptsLoading) return <Loader />;
  if (!department && !activeDepartmentId) return <div className="p-6">No department data found</div>;

  return (
    <>
      <Header
        title={department?.name || "Department Details"}
        subtitle={department?.universityName || ""}
        breadcrumbs={[
          { label: "Departments", path: "/department-management" },
          { label: department?.name || "Details" },
        ]}
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => setIsAddSubdeptOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold tracking-wider uppercase shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              <Plus size={16} className="shrink-0" />
              <span>Add Sub-Department</span>
            </button>
          )
        }
      />

      {/* Department Description Overview Banner */}
      {department?.description && (
        <div className="px-3 sm:px-6 pt-4 sm:pt-6">
          <div className="bg-gradient-to-r from-orange-50/60 via-white to-amber-50/40 border border-orange-100/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/60">
                <MdAccountTree size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-md">
                    Department Overview
                  </span>
                  {department.headOfDepartment && (
                    <span className="text-xs text-slate-500 font-medium">
                      • HOD: <strong className="text-slate-700">{department.headOfDepartment}</strong>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line break-words">
                  {department.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Departments Content: Single Pager if 1, Normal Cards Grid if > 1, EmptyState if 0 */}
      <div className="px-3 sm:px-6 mt-4 sm:mt-6 pb-8">
        {subdepartments.length === 0 ? (
          <EmptyState
            icon={MdAccountTree}
            title="No Sub-Departments Found"
            subtitle="Add sub-departments using 'Add Sub-Department' above to organize academic levels."
          />
        ) : subdepartments.length === 1 ? (
          /* Single Sub-Department: Simple Single Pager View (No carousel controls) */
          <div className="w-full">
            <SubDepartmentCard
              variant="fullpage"
              title={subdepartments[0].name}
              departmentName={department?.name}
              status={subdepartments[0].isActive}
              totalStudents={subdepartments[0].totalStudents || 0}
              allowedCourses={subdepartments[0].allowedCourses || []}
              faculties={subdepartments[0].faculties || []}
              levelCounts={subdepartments[0].levelCounts || []}
              onView={() => handleViewSubdept(subdepartments[0])}
              onEdit={handleEditSubdept(subdepartments[0])}
            />
          </div>
        ) : (
          /* Multiple Sub-Departments: Normal Cards Grid on Single Page */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-extrabold text-gray-800 uppercase tracking-wider">
                  Sub-Departments
                </h2>
                <span className="text-[11px] font-bold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
                  {subdepartments.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {subdepartments.map((subdept) => (
                <SubDepartmentCard
                  key={subdept._id}
                  variant="compact"
                  title={subdept.name}
                  departmentName={department?.name}
                  status={subdept.isActive}
                  totalStudents={subdept.totalStudents || 0}
                  allowedCourses={subdept.allowedCourses || []}
                  faculties={subdept.faculties || []}
                  levelCounts={subdept.levelCounts || []}
                  onView={() => handleViewSubdept(subdept)}
                  onEdit={handleEditSubdept(subdept)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Sub-Department Drawer */}
      <OrangeButton
        isOpen={isAddSubdeptOpen}
        onClose={() => setIsAddSubdeptOpen(false)}
        panelTitle="Add Sub-Department"
        panelSubtitle={`Add new subdepartment in ${department?.name || "department"}`}
        leftBtnText="Cancel"
        rightBtnText={isAddingSubdept ? "Adding..." : "Add Sub-Department"}
        onLeftClick={() => setIsAddSubdeptOpen(false)}
        onRightClick={async () => {
          if (addSubdeptFormRef.current) {
            const errs = await addSubdeptFormRef.current.validateForm();
            if (errs && Object.keys(errs).length > 0) {
              const firstErr = Object.values(errs)[0];
              toast.error(typeof firstErr === "string" ? firstErr : "Please enter subdepartment name");
              return;
            }
            addSubdeptFormRef.current.submitForm();
          }
        }}
        drawerContent={
          <Formik
            innerRef={addSubdeptFormRef}
            initialValues={{
              name: "",
              departmentId: activeDepartmentId,
              allowedCourses: [],
              isActive: true,
            }}
            validationSchema={validationSchema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting, resetForm }) => {
              try {
                const targetDeptId = values.departmentId || activeDepartmentId;
                if (!targetDeptId) {
                  toast.error("Department ID missing. Please refresh and try again.");
                  return;
                }
                await addSubdepartment({
                  name: values.name.trim(),
                  departmentId: targetDeptId,
                  allowedCourses: (values.allowedCourses || []).filter(Boolean),
                  isActive: values.isActive,
                }).unwrap();
                toast.success("Subdepartment added successfully!");
                resetForm();
                setIsAddSubdeptOpen(false);
                refetch();
              } catch (error) {
                toast.error(error?.data?.message || error?.message || "Error adding subdepartment");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, setFieldValue }) => (
              <Form className="space-y-4">
                <InputField
                  label="Subdepartment Name"
                  name="name"
                  placeholder="Enter subdepartment name (e.g. Computer Science)"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Allowed Courses</label>
                  {departmentCourses.length > 0 ? (
                    <div className="space-y-2">
                      {departmentCourses.map((course) => (
                        <label key={course} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={values.allowedCourses.includes(course)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...values.allowedCourses, course]
                                : values.allowedCourses.filter((c) => c !== course);
                              setFieldValue("allowedCourses", updated);
                            }}
                            className="w-4 h-4 accent-orange-500 rounded"
                          />
                          <span className="text-sm text-gray-700">{course}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No courses defined in this department. You can assign courses later.
                    </p>
                  )}
                </div>
                <RadioGroup label="Status" name="isActive" required={false} />
              </Form>
            )}
          </Formik>
        }
      />

      {/* Edit Sub-Department Drawer */}
      <OrangeButton
        isOpen={Boolean(editingSubdept)}
        onClose={() => setEditingSubdept(null)}
        panelTitle="Edit Sub-Department"
        panelSubtitle={editingSubdept ? `Editing: ${editingSubdept.name}` : ""}
        leftBtnText="Cancel"
        rightBtnText={isUpdatingSubdept ? "Updating..." : "Update Sub-Department"}
        onLeftClick={() => setEditingSubdept(null)}
        onRightClick={async () => {
          if (editSubdeptFormRef.current) {
            const errs = await editSubdeptFormRef.current.validateForm();
            if (errs && Object.keys(errs).length > 0) {
              const firstErr = Object.values(errs)[0];
              toast.error(typeof firstErr === "string" ? firstErr : "Please enter subdepartment name");
              return;
            }
            editSubdeptFormRef.current.submitForm();
          }
        }}
        drawerContent={
          editingSubdept && (
            <Formik
              innerRef={editSubdeptFormRef}
              initialValues={{
                name: editingSubdept.name || "",
                departmentId:
                  editingSubdept.departmentId?._id ||
                  editingSubdept.departmentId ||
                  activeDepartmentId,
                allowedCourses: editingSubdept.allowedCourses || [],
                isActive: editingSubdept.isActive ?? true,
              }}
              validationSchema={validationSchema}
              enableReinitialize
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  const targetDeptId = values.departmentId || activeDepartmentId;
                  await updateSubdepartment({
                    subdepartmentId: editingSubdept._id,
                    name: values.name.trim(),
                    departmentId: targetDeptId,
                    allowedCourses: (values.allowedCourses || []).filter(Boolean),
                    isActive: values.isActive,
                  }).unwrap();
                  toast.success("Subdepartment updated successfully!");
                  resetForm();
                  setEditingSubdept(null);
                  refetch();
                } catch (error) {
                  toast.error(error?.data?.message || error?.message || "Error updating subdepartment");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ values, setFieldValue }) => (
                <Form className="space-y-4">
                  <InputField label="Subdepartment Name" name="name" placeholder="Enter subdepartment name" />
                  <div>
                    <label className="block text-sm font-medium mb-2">Allowed Courses</label>
                    {departmentCourses.length > 0 ? (
                      <div className="space-y-2">
                        {departmentCourses.map((course) => (
                          <label key={course} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={values.allowedCourses.includes(course)}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...values.allowedCourses, course]
                                  : values.allowedCourses.filter((c) => c !== course);
                                setFieldValue("allowedCourses", updated);
                              }}
                              className="w-4 h-4 accent-orange-500 rounded"
                            />
                            <span className="text-sm text-gray-700">{course}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No courses defined in this department.</p>
                    )}
                  </div>
                  <RadioGroup label="Status" name="isActive" required={false} />
                </Form>
              )}
            </Formik>
          )
        }
      />
    </>
  );
};

export default DepartmentDetails;
