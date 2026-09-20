import { useState, useMemo } from 'react';
import Header from '../../../shared/sidebar/Header';
import { useGetAllSubdepartmentsQuery, useGetAllDepartmentsQuery, useAddSubdepartmentMutation, useUpdateSubdepartmentMutation } from '../../../../redux/api/authApi';
import Loader from '../../../shared/loader/Loader';
import { MdAccountTree } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import OrangeButton from '../../../shared/sidebar/OrangeButton';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import InputField from '../../../shared/form-fields/InputField';
import RadioGroup from '../../../shared/form-fields/RadioGroup';
import SubDepartmentCard from './SubDepartmentCard';
import { usePermissions } from '../../../../hooks/usePermissions';
import EmptyState from '../../../shared/empty-state/EmptyState';

// Reusable course checkbox list — shows courses from the selected department
const CourseCheckboxes = ({ departmentId, departments, values, setFieldValue }) => {
    const dept = departments.find(d => d._id === departmentId);
    const courses = (dept?.allowedCourses || []).map(c => c.courseName).filter(Boolean);

    if (!departmentId) return <p className="text-xs text-gray-400">Select a department first.</p>;
    if (courses.length === 0) return <p className="text-xs text-gray-400">No courses defined in this department.</p>;

    return (
        <div className="space-y-2">
            {courses.map((course) => (
                <label key={course} className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={values.allowedCourses.includes(course)}
                        onChange={(e) => {
                            const updated = e.target.checked
                                ? [...values.allowedCourses, course]
                                : values.allowedCourses.filter(c => c !== course);
                            setFieldValue('allowedCourses', updated);
                        }}
                        className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-gray-700">{course}</span>
                </label>
            ))}
        </div>
    );
};

const SubDepartment = () => {
    const { hasPermission } = usePermissions();
    const { data: subdepartmentsData, isLoading, refetch } = useGetAllSubdepartmentsQuery();
    const { data: departmentsData } = useGetAllDepartmentsQuery();
    const [addSubdepartment] = useAddSubdepartmentMutation();
    const [updateSubdepartment] = useUpdateSubdepartmentMutation();
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const subdepartments = subdepartmentsData?.data || [];
    const departments = departmentsData?.data || [];

    const filteredSubdepartments = useMemo(() => {
        const s = searchTerm.toLowerCase();
        return subdepartments.filter(sd =>
            sd.name?.toLowerCase().includes(s) ||
            sd.departmentId?.name?.toLowerCase().includes(s)
        );
    }, [subdepartments, searchTerm]);

    const validationSchema = Yup.object({
        name: Yup.string().required('Subdepartment name is required'),
        departmentId: Yup.string().required('Department is required'),
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
            toast.success('Subdepartment added successfully!');
            resetForm();
            refetch();
        } catch (error) {
            toast.error(error?.data?.message || 'Error saving subdepartment');
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) return <Loader />;

    return (
        <>
            <Header title="Sub Departments" showBack={false} />

            <div className="px-3 sm:px-6 pb-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between py-4 sm:py-5 gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sub Departments</h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage academic structure</p>
                    </div>
                    {hasPermission('Page_SubDepartment', 'create') && (
                        <Formik
                            initialValues={{ name: '', departmentId: '', allowedCourses: [], isActive: true }}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmit}
                        >
                            {({ values, setFieldValue, isSubmitting, submitForm, resetForm }) => (
                                <OrangeButton
                                    buttonTitle="+ Create Sub-Department"
                                    panelTitle="Add New Subdepartment"
                                    drawerContent={
                                        <Form className="space-y-4">
                                            <InputField label="Subdepartment Name" name="name" placeholder="Enter subdepartment name" />

                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">Department <span className="text-red-400">*</span></label>
                                                <select
                                                    value={values.departmentId}
                                                    onChange={(e) => {
                                                        setFieldValue('departmentId', e.target.value);
                                                        setFieldValue('allowedCourses', []);
                                                    }}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                                                >
                                                    <option value="">Select department</option>
                                                    {departments.map(d => (
                                                        <option key={d._id} value={d._id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2">Allowed Courses</label>
                                                <CourseCheckboxes
                                                    departmentId={values.departmentId}
                                                    departments={departments}
                                                    values={values}
                                                    setFieldValue={setFieldValue}
                                                />
                                            </div>

                                            <RadioGroup label="Status" name="isActive" required={false} />
                                        </Form>
                                    }
                                    leftBtnText="Cancel"
                                    rightBtnText={isSubmitting ? 'Adding...' : 'Add Subdepartment'}
                                    onLeftClick={resetForm}
                                    onRightClick={submitForm}
                                />
                            )}
                        </Formik>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                    {filteredSubdepartments.length === 0 ? (
                        <div className="col-span-full">
                            <EmptyState
                                icon={MdAccountTree}
                                title="No Sub-Departments Found"
                                subtitle="Add sub-departments to group student courses and academic tracks."
                                actionText="+ Add Sub-Department"
                                onAction={() => setIsModalOpen(true)}
                            />
                        </div>
                    ) : (
                        filteredSubdepartments.map((subdept) => (
                            <Formik
                                key={subdept._id}
                                initialValues={{
                                    name: subdept.name,
                                    departmentId: subdept.departmentId?._id || subdept.departmentId || '',
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
                                        toast.success('Subdepartment updated successfully!');
                                        resetForm();
                                        refetch();
                                    } catch (error) {
                                        toast.error(error?.data?.message || 'Error updating subdepartment');
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                                enableReinitialize
                            >
                                {({ values, setFieldValue, isSubmitting, submitForm, resetForm }) => (
                                    <SubDepartmentCard
                                        key={subdept._id}
                                        title={subdept.name}
                                        departmentName={subdept.departmentId?.name}
                                        status={subdept.isActive}
                                        totalStudents={subdept.totalStudents || 0}
                                        allowedCourses={subdept.allowedCourses || []}
                                        faculties={subdept.faculties || []}
                                        levelCounts={subdept.levelCounts || []}
                                        onView={() => navigate(`/subdepartment/${subdept._id}/levels`, {
                                            state: { departmentId: subdept.departmentId?._id || subdept.departmentId, subdepartment: subdept, departmentName: subdept.departmentId?.name }
                                        })}
                                        onEdit={
                                            hasPermission('Page_SubDepartment', 'update') ? (
                                                <OrangeButton
                                                    buttonTitle="Edit"
                                                    panelTitle="Edit Subdepartment"
                                                    customButtonClass="w-full py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition bg-white"
                                                    drawerContent={
                                                        <Form className="space-y-4">
                                                            <InputField label="Subdepartment Name" name="name" placeholder="Enter subdepartment name" />

                                                            <div>
                                                                <label className="block text-sm font-medium mb-1.5">Department</label>
                                                                <select
                                                                    value={values.departmentId}
                                                                    onChange={(e) => {
                                                                        setFieldValue('departmentId', e.target.value);
                                                                        setFieldValue('allowedCourses', []);
                                                                    }}
                                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                                                                >
                                                                    <option value="">Select department</option>
                                                                    {departments.map(d => (
                                                                        <option key={d._id} value={d._id}>{d.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium mb-2">Allowed Courses</label>
                                                                <CourseCheckboxes
                                                                    departmentId={values.departmentId}
                                                                    departments={departments}
                                                                    values={values}
                                                                    setFieldValue={setFieldValue}
                                                                />
                                                            </div>

                                                            <RadioGroup label="Status" name="isActive" required={false} />
                                                        </Form>
                                                    }
                                                    leftBtnText="Cancel"
                                                    rightBtnText={isSubmitting ? 'Updating...' : 'Update'}
                                                    onLeftClick={resetForm}
                                                    onRightClick={submitForm}
                                                />
                                            ) : null
                                        }
                                    />
                                )}
                            </Formik>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default SubDepartment;
