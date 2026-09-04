import { useState } from "react";
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

const DepartmentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: departmentIdParam } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);

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
      <Formik
            initialValues={{ name: "", departmentId: department?._id || "", allowedCourses: [], isActive: true }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, isSubmitting, submitForm, resetForm }) => (
              <Header
                title={department.name}
                breadcrumbs={[
                  { label: "Departments", path: "/department-management" },
                  { label: department.name }
                ]}
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

        {/* Sliding Carousel of Sub-Departments */}
        <div className="px-6 mt-6 pb-8">
          {subdepartments.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
              <MdAccountTree size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No subdepartments found</p>
            </div>
          ) : (
            <div className="relative w-full max-w-none mx-auto px-1 md:px-14 flex flex-col items-center">
              {/* Outer Slider Window */}
              <div className="w-full overflow-hidden rounded-2xl relative">
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
                        onView={() => navigate("/subdepartment-details", {
                          state: { departmentId: department._id, subdepartment: subdept, departmentName: department.name }
                        })}
                        onEdit={
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
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Slider Navigation Controls */}
              {subdepartments.length > 1 && (
                <>
                  {/* Left Arrow Button */}
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev === 0 ? subdepartments.length - 1 : prev - 1))}
                    className="absolute left-1 md:left-4 top-[50%] transform -translate-y-1/2 bg-white/90 backdrop-blur-xs text-gray-800 p-3 rounded-full shadow-lg border border-gray-250 hover:bg-orange-50 hover:text-orange-500 transition-all duration-200 z-20 hover:scale-105 active:scale-95"
                    aria-label="Previous Slide"
                  >
                    <HiChevronLeft size={24} />
                  </button>

                  {/* Right Arrow Button */}
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev === subdepartments.length - 1 ? 0 : prev + 1))}
                    className="absolute right-1 md:right-4 top-[50%] transform -translate-y-1/2 bg-white/90 backdrop-blur-xs text-gray-800 p-3 rounded-full shadow-lg border border-gray-250 hover:bg-orange-50 hover:text-orange-500 transition-all duration-200 z-20 hover:scale-105 active:scale-95"
                    aria-label="Next Slide"
                  >
                    <HiChevronRight size={24} />
                  </button>

                  {/* Indicators (Dots) */}
                  <div className="flex gap-2 mt-4">
                    {subdepartments.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          currentIndex === idx ? 'bg-orange-500 w-6' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
    </>
  );
};

export default DepartmentDetails;
