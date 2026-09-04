import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useGetSubdepartmentByIdQuery, useGetLevelsBySubdepartmentQuery, useGetSubLevelsByLevelQuery, useAddLevelMutation, useUpdateLevelMutation } from "../../../../redux/api/authApi";
import { toast } from "react-toastify";
import Header from "../../../shared/sidebar/Header";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import { MdLayers } from "react-icons/md";
import Loader from "../../../shared/loader/Loader";
import { usePermissions } from "../../../../hooks/usePermissions";

const SubLevelCount = ({ levelId, render }) => {
  const { data } = useGetSubLevelsByLevelQuery(levelId, { skip: !levelId });
  const list = data?.data || [];
  return render(list.length, list);
};

const validationSchema = Yup.object({
  name: Yup.string().required("Level name is required"),
  order: Yup.number().required("Order is required").positive("Must be positive"),
  isActive: Yup.boolean(),
});

// LevelCard matching project design guidelines
const LevelCard = ({ level, subLevelCount, subLevelsList, onView, onEdit }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:border-orange-200 transition-all duration-200 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center font-bold flex-shrink-0">
            <MdLayers size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider truncate">{level.name}</h3>
            <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 mt-1 rounded-full ${
              level.isActive 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              {level.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="text-right text-[10px] font-black text-gray-400 uppercase tracking-wider">
          Order: {level.order}
        </div>
      </div>

      {/* SubLevels Detailed Table */}
      <div className="flex-1 mb-5">
        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
          Sub Levels ({subLevelCount})
        </span>
        {subLevelsList && subLevelsList.length > 0 ? (
          <div className="border border-slate-50 rounded-2xl overflow-hidden bg-slate-50/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-1.5">Sub Level</th>
                  <th className="px-3 py-1.5">Subject</th>
                  <th className="px-3 py-1.5 text-right">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-gray-700">
                {subLevelsList.map((subLevel) => (
                  <tr key={subLevel._id} className="hover:bg-slate-50/80 transition duration-150">
                    <td className="px-3 py-1.5 font-bold text-slate-800">{subLevel.name}</td>
                    <td className="px-3 py-1.5 font-semibold text-slate-500 truncate max-w-[110px]" title={subLevel.subjects?.join(', ') || 'N/A'}>
                      {subLevel.subjects?.join(', ') || 'N/A'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-black text-orange-500">{subLevel.studentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-100 p-4 text-center">
            <span className="text-xs text-gray-400 italic">No sublevels found</span>
          </div>
        )}
      </div>

      {/* Action buttons at the bottom (aligned to bottom) */}
      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-100">
        <button
          onClick={onView}
          className="flex-1 py-2 text-xs font-bold text-gray-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl transition duration-150 cursor-pointer text-center"
        >
          View
        </button>
        <div className="flex-1">
          {onEdit}
        </div>
      </div>
    </div>
  );
};

const SubdepartmentDetails = () => {
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: paramSubdeptId } = useParams();

  const subdepartmentId = paramSubdeptId || location.state?.subdepartment?._id;
  const { data: subdepartmentData, isLoading: isSubdeptLoading } = useGetSubdepartmentByIdQuery(subdepartmentId, { skip: !subdepartmentId });

  const subdepartment  = subdepartmentData?.data || location.state?.subdepartment;
  const departmentObj  = typeof subdepartment?.departmentId === "object" ? subdepartment?.departmentId : null;
  const departmentId   = location.state?.departmentId || departmentObj?._id || (typeof subdepartment?.departmentId === "string" ? subdepartment?.departmentId : "");

  const { data: levelsData, isLoading: isLevelsLoading, refetch } = useGetLevelsBySubdepartmentQuery(subdepartmentId, { skip: !subdepartmentId });
  const [addLevel] = useAddLevelMutation();
  const [updateLevel] = useUpdateLevelMutation();

  const departmentName = location.state?.departmentName || departmentObj?.name || "Department";
  const levels = [...(levelsData?.data || [])].sort((a, b) => b.isActive - a.isActive);

  if (isSubdeptLoading || isLevelsLoading) return <Loader />;
  if (!subdepartment) return <div className="p-6">No subdepartment data found</div>;

  const breadcrumbs = hasPermission('Page_Department')
    ? [
        { label: "Departments", path: "/department-management" },
        { label: departmentName || "Department", path: `/department-details/${departmentId}`, state: { department: subdepartment?.departmentId } },
        { label: subdepartment.name },
      ]
    : [
        { label: "Sub-Departments", path: "/subdepartments" },
        { label: subdepartment.name },
      ];

  return (
    <>
      {hasPermission('Page_Level', 'create') ? (
        <Formik
          initialValues={{ name: "", order: "", isActive: true }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            try {
              await addLevel({ name: values.name, order: Number(values.order), subDepartmentId: subdepartmentId, isActive: values.isActive }).unwrap();
              toast.success("Level added successfully!");
              resetForm();
              refetch();
            } catch (error) {
              toast.error(error?.data?.message || "Error adding level");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, submitForm, resetForm }) => (
            <Header
              title={subdepartment.name}
              showBack={true}
              breadcrumbs={breadcrumbs}
            >
              <OrangeButton
                buttonTitle="+ New Level"
                panelTitle="Add New Level"
                drawerContent={
                  <Form className="space-y-4">
                    <InputField label="Level Name" name="name" placeholder="Enter level name" />
                    <InputField label="Order" name="order" type="number" placeholder="Enter order number" />
                    <RadioGroup label="Status" name="isActive" required={false} />
                  </Form>
                }
                leftBtnText="Cancel"
                rightBtnText={isSubmitting ? "Adding..." : "Add Level"}
                onLeftClick={resetForm}
                onRightClick={submitForm}
              />
            </Header>
          )}
        </Formik>
      ) : (
        <Header
          title={subdepartment.name}
          showBack={true}
          breadcrumbs={breadcrumbs}
        />
      )}

      <div className="px-6">
        <div className="flex items-end justify-between py-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subdepartment.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage levels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {levels.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <MdLayers size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No levels found</p>
            </div>
          ) : (
            levels.map((level) => (
              <SubLevelCount
                key={level._id}
                levelId={level._id}
                render={(subLevelCount, subLevelsList) => (
                  <LevelCard
                    level={level}
                    subLevelCount={subLevelCount}
                    subLevelsList={subLevelsList}
                    onView={() => navigate("/show-sublevel-tables", { state: { level, subdepartment, departmentId, departmentName } })}
                    onEdit={
                      hasPermission('Page_Level', 'update') ? (
                        <Formik
                          key={level._id}
                          initialValues={{ name: level.name, order: level.order, isActive: level.isActive }}
                          validationSchema={validationSchema}
                          onSubmit={async (values, { setSubmitting, resetForm }) => {
                            try {
                              await updateLevel({ levelId: level._id, name: values.name, order: Number(values.order), subDepartmentId: subdepartmentId, isActive: values.isActive }).unwrap();
                              toast.success("Level updated successfully!");
                              resetForm();
                              refetch();
                            } catch (error) {
                              toast.error(error?.data?.message || "Error updating level");
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                        >
                          {({ isSubmitting, submitForm, resetForm }) => (
                            <OrangeButton
                              buttonTitle="Edit"
                              panelTitle="Edit Level"
                              customButtonClass="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-xs font-bold transition duration-150 cursor-pointer"
                              drawerContent={
                                <Form className="space-y-4">
                                  <InputField label="Level Name" name="name" placeholder="Enter level name" />
                                  <InputField label="Order" name="order" type="number" placeholder="Enter order number" />
                                  <RadioGroup label="Status" name="isActive" required={false} />
                                </Form>
                              }
                              leftBtnText="Cancel"
                              rightBtnText={isSubmitting ? "Updating..." : "Update Level"}
                              onLeftClick={resetForm}
                              onRightClick={submitForm}
                            />
                          )}
                        </Formik>
                      ) : null
                    }
                  />
                )}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default SubdepartmentDetails;
