import { useState } from "react";
import { useSelector } from "react-redux";
import Header from "../../../shared/sidebar/Header";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useGetSubdepartmentsByDepartmentQuery, useGetAllDepartmentsQuery, useAddSubdepartmentMutation, useUpdateSubdepartmentMutation } from "../../../../redux/api/authApi";
import { toast } from "react-toastify";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import SubDepartmentCard from "./SubDepartmentCard";
import { MdAccountTree } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import { MdOutlineMenuBook } from "react-icons/md";
import Loader from "../../../shared/loader/Loader";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import EmptyState from "../../../shared/empty-state/EmptyState";
import AddStudentModal from "../../students/AddStudentModal";
import { UserPlus } from "lucide-react";

const DepartmentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: departmentIdParam } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [selectedSubDeptId, setSelectedSubDeptId] = useState(null);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev === subdepartments.length - 1 ? 0 : prev + 1));
    }
    if (isRightSwipe) {
      setCurrentIndex((prev) => (prev === 0 ? subdepartments.length - 1 : prev - 1));
    }
  };

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
    skip: Boolean(stateDept?._id)
  });

  const department = stateDept || (allDepartmentsData?.data || []).find(d => d._id === departmentIdParam);
  const departmentId = department?._id || departmentIdParam;

  // Extract course names from department's allowedCourses for subdept dropdown
  const departmentCourses = (department?.allowedCourses || []).map(c => c.courseName).filter(Boolean);

  const { data: subdepartmentsData, isLoading: isSubdeptsLoading, refetch } = useGetSubdepartmentsByDepartmentQuery(departmentId, {
    skip: !departmentId
  });
  const [addSubdepartment] = useAddSubdepartmentMutation();
  const [updateSubdepartment] = useUpdateSubdepartmentMutation();

  const subdepartments = [...(subdepartmentsData?.data || [])].sort((a, b) => b.isActive - a.isActive);

  const validationSchema = Yup.object({
    name: Yup.string().required("Subdepartment name is required"),
    departmentId: Yup.string().required("Department is required"),
    allowedCourses: Yup.array().of(Yup.string()),
    isActive: Yup.boolean()
  });

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await addSubdepartment({
        name: values.name,
        departmentId: values.departmentId,
        allowedCourses: values.allowedCourses.filter(c => c),
        isActive: values.isActive
      }).unwrap();
      toast.success("Subdepartment added successfully!");
      resetForm();
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Error saving subdepartment");
    } finally {
      setSubmitting(false);
    }
  };

  if (isDeptsLoading || isSubdeptsLoading) return <Loader />;
  if (!department) return <div className="p-6">No department data found</div>;

  return (
    <>
      {canManage ? (
        <Formik
          initialValues={{ name: "", departmentId: department?._id || "", allowedCourses: [], isActive: true }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, isSubmitting, submitForm, resetForm }) => (
            <Header
              title={department.name}
              subtitle={department.universityName}
              breadcrumbs={[
                { label: "Departments", path: "/department-management" },
                { label: department.name }
              ]}
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubDeptId(null);
                    setIsAddStudentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                >
                  <UserPlus size={16} />
                  <span>Add Student</span>
                </button>
              }
            >
              <OrangeButton
                buttonTitle="+ Create Sub-Department"
                panelTitle="Add New Subdepartment"
                drawerContent={
                  <Form className="space-y-4">
                    <InputField label="Subdepartment Name" name="name" placeholder="Enter subdepartment name" />
                    {/* departmentId is hidden — auto-filled from department context */}
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
                                    : values.allowedCourses.filter(c => c !== course);
                                  setFieldValue("allowedCourses", updated);
                                }}
                                className="w-4 h-4 accent-orange-500"
                              />
                              <span className="text-sm text-gray-700">{course}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No courses defined in this department. Add courses while creating/editing the department.</p>
                      )}
                    </div>
                    <RadioGroup label="Status" name="isActive" required={false} />
                  </Form>
                }
                leftBtnText="Cancel"
                rightBtnText={isSubmitting ? "Adding..." : "Add Subdepartment"}
                onLeftClick={resetForm}
                onRightClick={submitForm}
              />
            </Header>
          )}
        </Formik>
      ) : (
        <Header
          title={department.name}
          subtitle={department.universityName}
          breadcrumbs={[
            { label: "Departments", path: "/department-management" },
            { label: department.name }
          ]}
          actions={
            <button
              type="button"
              onClick={() => {
                setSelectedSubDeptId(null);
                setIsAddStudentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3.5 sm:px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              <UserPlus size={16} />
              <span>Add Student</span>
            </button>
          }
        />
      )}

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

        {/* Sliding Carousel of Sub-Departments */}
        <div className="px-3 sm:px-6 mt-4 sm:mt-6 pb-8">
          {subdepartments.length === 0 ? (
            <EmptyState
              icon={MdAccountTree}
              title="No Sub-Departments Found"
              subtitle="Add sub-departments using '+ Add Subdepartment' above to organize academic levels."
            />
          ) : (
            <div className="relative w-full max-w-none mx-auto px-0 md:px-14 flex flex-col items-center">
              {/* Mobile Subdepartment Counter & Swipe Hint */}
              {subdepartments.length > 1 && (
                <div className="w-full flex items-center justify-between gap-2 mb-3 md:hidden px-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {currentIndex + 1} of {subdepartments.length} Sub-Departments
                  </span>
                  <span className="text-[10px] text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                    Swipe ⇄
                  </span>
                </div>
              )}

              {/* Outer Slider Window */}
              <div 
                className="w-full overflow-hidden rounded-2xl relative"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${Math.min(currentIndex, Math.max(0, subdepartments.length - 1)) * 100}%)` }}
                >
                  {subdepartments.map((subdept) => (
                    <div key={subdept._id} className="w-full flex-shrink-0 px-2">
                      <SubDepartmentCard
                        variant="fullpage"
                        title={subdept.name}
                        departmentName={department.name}
                        status={subdept.isActive}
                        totalStudents={subdept.totalStudents || 0}
                        allowedCourses={subdept.allowedCourses || []}
                        faculties={subdept.faculties || []}
                        levelCounts={subdept.levelCounts || []}
                        onView={() => navigate(`/subdepartment/${subdept._id}/levels`, {
                          state: { departmentId: department._id, subdepartment: subdept, departmentName: department.name }
                        })}

                        onEdit={
                          canManage ? (
                            <Formik
                              key={subdept._id}
                              initialValues={{
                                name: subdept.name,
                                departmentId: subdept.departmentId?._id || subdept.departmentId || department._id,
                                allowedCourses: subdept.allowedCourses || [],
                                isActive: subdept.isActive
                              }}
                              validationSchema={validationSchema}
                              onSubmit={async (values, { setSubmitting, resetForm }) => {
                                try {
                                  await updateSubdepartment({
                                    subdepartmentId: subdept._id,
                                    name: values.name,
                                    departmentId: values.departmentId,
                                    allowedCourses: values.allowedCourses.filter(c => c),
                                    isActive: values.isActive
                                  }).unwrap();
                                  toast.success("Subdepartment updated successfully!");
                                  resetForm();
                                  refetch();
                                } catch (error) {
                                  toast.error(error?.data?.message || "Error updating subdepartment");
                                } finally {
                                  setSubmitting(false);
                                }
                              }}
                            >
                              {({ values, setFieldValue, isSubmitting, submitForm, resetForm }) => (
                                <OrangeButton
                                  buttonTitle="Edit"
                                  panelTitle="Edit Subdepartment"
                                  customButtonClass="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-orange-600 transition"
                                  drawerContent={
                                    <Form className="space-y-4">
                                      <InputField label="Subdepartment Name" name="name" placeholder="Enter subdepartment name" />
                                      {/* departmentId hidden — auto-filled */}
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
                                                      : values.allowedCourses.filter(c => c !== course);
                                                    setFieldValue("allowedCourses", updated);
                                                  }}
                                                  className="w-4 h-4 accent-orange-500"
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
                                  }
                                  leftBtnText="Cancel"
                                  rightBtnText={isSubmitting ? "Updating..." : "Update"}
                                  onLeftClick={resetForm}
                                  onRightClick={submitForm}
                                />
                              )}
                            </Formik>
                          ) : null
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Slider Navigation Controls */}
              {subdepartments.length > 1 && (
                <>
                  {/* Left Arrow Button (Desktop) */}
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev === 0 ? subdepartments.length - 1 : prev - 1))}
                    className="hidden md:flex absolute left-2 md:left-4 top-[50%] transform -translate-y-1/2 bg-white/95 backdrop-blur-xs text-gray-800 p-3 rounded-full shadow-lg border border-gray-250 hover:bg-orange-50 hover:text-orange-500 transition-all duration-200 z-20 hover:scale-105 active:scale-95 items-center justify-center cursor-pointer"
                    aria-label="Previous Slide"
                  >
                    <HiChevronLeft size={24} />
                  </button>

                  {/* Right Arrow Button (Desktop) */}
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev === subdepartments.length - 1 ? 0 : prev + 1))}
                    className="hidden md:flex absolute right-2 md:right-4 top-[50%] transform -translate-y-1/2 bg-white/95 backdrop-blur-xs text-gray-800 p-3 rounded-full shadow-lg border border-gray-250 hover:bg-orange-50 hover:text-orange-500 transition-all duration-200 z-20 hover:scale-105 active:scale-95 items-center justify-center cursor-pointer"
                    aria-label="Next Slide"
                  >
                    <HiChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Bottom Pagination & Mobile Nav Arrows */}
              {subdepartments.length > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4 sm:mt-5">
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev === 0 ? subdepartments.length - 1 : prev - 1))}
                    className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-orange-500 active:scale-95 transition cursor-pointer"
                    aria-label="Previous Slide"
                  >
                    <HiChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {subdepartments.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`rounded-full transition-all duration-300 cursor-pointer ${
                          currentIndex === idx ? 'bg-orange-500 w-5 h-2' : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentIndex((prev) => (prev === subdepartments.length - 1 ? 0 : prev + 1))}
                    className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 text-gray-700 hover:bg-orange-50 hover:text-orange-500 active:scale-95 transition cursor-pointer"
                    aria-label="Next Slide"
                  >
                    <HiChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => {
          setIsAddStudentModalOpen(false);
          setSelectedSubDeptId(null);
        }}
        defaultSubDepartmentId={selectedSubDeptId}
        onStudentAdded={() => refetch()}
      />
    </>
  );
};

export default DepartmentDetails;
