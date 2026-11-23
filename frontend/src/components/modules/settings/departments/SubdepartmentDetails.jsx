import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  useGetSubdepartmentByIdQuery,
  useGetLevelsBySubdepartmentQuery,
  useGetSubLevelsByLevelQuery,
  useAddLevelMutation,
  useUpdateLevelMutation,
  useDeleteLevelMutation
} from "../../../../redux/api/authApi";
import { toast } from "react-toastify";
import Header from "../../../shared/sidebar/Header";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import InputField from "../../../shared/form-fields/InputField";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import { MdLayers, MdWarning, MdVisibility, MdEdit, MdDeleteOutline } from "react-icons/md";
import Loader from "../../../shared/loader/Loader";
import { usePermissions } from "../../../../hooks/usePermissions";
import { DeleteConfirmModal } from "../../../shared/modal/DeleteConfirmModal";

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

// LevelCard with responsive mobile card-rows & desktop table
const LevelCard = ({ level, subLevelCount, subLevelsList, onView, onEdit, onDelete }) => {
  const totalStudents = subLevelsList?.reduce((acc, curr) => acc + (curr.studentCount || 0), 0) || 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-xs sm:shadow-sm hover:border-orange-200 transition-all duration-200 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center font-bold flex-shrink-0">
            <MdLayers size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-gray-800 uppercase tracking-wide truncate">{level.name}</h3>
            <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 mt-1 rounded-full ${level.isActive
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
              {level.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2.5 py-1 bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider rounded-full">
            Order: {level.order}
          </span>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete Level"
              className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl border border-red-200/80 bg-red-50/60 hover:bg-red-100 active:bg-red-200 text-red-600 hover:text-red-700 transition-all duration-200 active:scale-95 shadow-2xs hover:shadow-xs flex items-center justify-center cursor-pointer shrink-0"
              aria-label="Delete Level"
            >
              <MdDeleteOutline size={15} />
            </button>
          )}
        </div>
      </div>

      {/* SubLevels Section */}
      <div className="flex-1 mb-4 sm:mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Sub Levels ({subLevelCount})
          </span>
          {subLevelCount > 0 && (
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-full sm:hidden">
              {totalStudents} {totalStudents === 1 ? "student" : "students"}
            </span>
          )}
        </div>

        {subLevelsList && subLevelsList.length > 0 ? (
          <>
            {/* Mobile View: Clean Card Rows (< sm) */}
            <div className="block sm:hidden space-y-2">
              {subLevelsList.map((subLevel) => (
                <div
                  key={subLevel._id}
                  className="bg-slate-50/70 border border-slate-100/90 rounded-xl p-2.5 hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-800 tracking-tight">{subLevel.name}</span>
                    <span className="inline-flex items-center text-[10px] font-bold text-orange-600 bg-white border border-orange-200/60 px-2 py-0.5 rounded-full flex-shrink-0 shadow-2xs">
                      {subLevel.studentCount ?? 0} {subLevel.studentCount === 1 ? "student" : "students"}
                    </span>
                  </div>
                  {subLevel.subjects && subLevel.subjects.length > 0 ? (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Subjects:</span>
                      {subLevel.subjects.map((subj, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200/70 rounded-md px-1.5 py-0.5 leading-tight"
                        >
                          {subj}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic mt-1">No subjects assigned</p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View: Full Table (>= sm) */}
            <div className="hidden sm:block border border-slate-100 rounded-2xl overflow-x-auto bg-slate-50/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="px-3 py-2">Sub Level</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2 text-right">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-gray-700">
                  {subLevelsList.map((subLevel) => (
                    <tr key={subLevel._id} className="hover:bg-slate-50/80 transition duration-150">
                      <td className="px-3 py-2 font-bold text-slate-800">{subLevel.name}</td>
                      <td className="px-3 py-2 font-semibold text-slate-500 truncate max-w-[120px]" title={subLevel.subjects?.join(', ') || 'N/A'}>
                        {subLevel.subjects?.join(', ') || 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-orange-500">{subLevel.studentCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-100 p-4 text-center">
            <span className="text-xs text-gray-400 italic">No sublevels found</span>
          </div>
        )}
      </div>

      {/* Action buttons at the bottom (aligned to bottom matching Department card exactly) */}
      <div className="flex items-center gap-2.5 sm:gap-3 mt-auto pt-3 sm:pt-4 border-t border-slate-100">
        <button
          onClick={onView}
          className="flex-1 border rounded-xl py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-[0.97] border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 cursor-pointer shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5"
        >
          <MdVisibility size={14} />
          <span>VIEW</span>
        </button>
        {onEdit && (
          <div className={`${onView ? 'flex-1' : 'w-full'} [&_button]:!w-full [&_button]:!h-full [&_button]:!py-2.5 [&_button]:!text-xs [&_button]:!font-bold [&_button]:!tracking-wider [&_button]:!uppercase [&_button]:!rounded-xl [&_button]:!transition-all [&_button]:!duration-200 [&_button]:active:scale-[0.97] [&_button]:!shadow-xs [&_button]:!bg-orange-500 [&_button]:!text-white [&_button]:hover:!bg-orange-600`}>
            {typeof onEdit === 'function' ? (
              <button
                type="button"
                onClick={onEdit}
                className="w-full h-full py-2.5 px-3 rounded-xl !bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MdEdit size={14} />
                <span>EDIT</span>
              </button>
            ) : (
              onEdit
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SubdepartmentDetails = () => {
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: paramSubdeptId } = useParams();
  const [searchParams] = useSearchParams();
  const [levelToDelete, setLevelToDelete] = useState(null);
  const [editingLevel, setEditingLevel] = useState(null);
  const editLevelFormRef = useRef(null);

  const querySubdeptId = searchParams.get("id");
  const subdepartmentId =
    paramSubdeptId ||
    querySubdeptId ||
    location.state?.subdepartment?._id ||
    sessionStorage.getItem("lastVisitedSubdepartmentId");

  useEffect(() => {
    if (subdepartmentId) {
      sessionStorage.setItem("lastVisitedSubdepartmentId", subdepartmentId);
    }
  }, [subdepartmentId]);

  const { data: subdepartmentData, isLoading: isSubdeptLoading } = useGetSubdepartmentByIdQuery(subdepartmentId, { skip: !subdepartmentId });

  const subdepartment = subdepartmentData?.data || location.state?.subdepartment;
  const departmentObj = typeof subdepartment?.departmentId === "object" ? subdepartment?.departmentId : null;
  const departmentId = location.state?.departmentId || departmentObj?._id || (typeof subdepartment?.departmentId === "string" ? subdepartment?.departmentId : "");

  const { data: levelsData, isLoading: isLevelsLoading, refetch } = useGetLevelsBySubdepartmentQuery(subdepartmentId, { skip: !subdepartmentId });
  const [addLevel] = useAddLevelMutation();
  const [updateLevel] = useUpdateLevelMutation();
  const [deleteLevel, { isLoading: isDeletingLevel }] = useDeleteLevelMutation();

  const departmentName = location.state?.departmentName || departmentObj?.name || "Department";

  // Filter out any inactive/deleted levels and sort by ascending numeric order (e.g. Level 1, Level 2)
  const levels = [...(levelsData?.data || [])]
    .filter((lvl) => lvl.isActive !== false)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  const handleDeleteLevel = async () => {
    if (!levelToDelete) return;
    try {
      await deleteLevel(levelToDelete._id).unwrap();
      toast.success("Level deleted successfully!");
      setLevelToDelete(null);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete level");
    }
  };

  if (isSubdeptLoading || isLevelsLoading) return <Loader />;
  if (!subdepartment) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-12 bg-white rounded-2xl border border-gray-150 shadow-xs">
        <MdLayers size={48} className="mx-auto text-gray-300 mb-3" />
        <h2 className="text-lg font-bold text-gray-800">Subdepartment Not Found</h2>
        <p className="text-xs text-gray-500 mt-1 mb-5">Could not load subdepartment details. Please go back to departments.</p>
        <button
          onClick={() => navigate("/department-management")}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Go to Departments
        </button>
      </div>
    );
  }

  const breadcrumbs = hasPermission('Page_Department')
    ? [
      { label: "Departments", path: "/department-management" },
      ...(departmentId
        ? [{ label: departmentName || "Department", path: `/department-details/${departmentId}`, state: { department: departmentObj } }]
        : []),
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

      {/* Sub-Department Overview Banner (Compact Single-Row Heading) */}
      <div className="px-3.5 sm:px-6 pt-3.5 sm:pt-4">
        <div className="bg-gradient-to-r from-orange-50/60 via-white to-amber-50/40 border border-orange-100/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/60">
              <MdLayers size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-md">
                  Sub-Department Overview
                </span>
                {departmentName && (
                  <span className="text-xs text-slate-500 font-medium">
                    • Department: <strong className="text-slate-700">{departmentName}</strong>
                  </span>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  • Levels: <strong className="text-slate-700">{levels.length}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  {subdepartment.name}
                </h2>
                <span className="text-slate-400 font-medium text-xs sm:text-sm">-</span>
                <span className="text-xs sm:text-sm text-slate-600 font-medium">
                  Manage levels and academic curriculum
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3.5 sm:px-6 mt-4 sm:mt-6 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-6">
          {levels.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
              <MdLayers size={44} className="mx-auto text-gray-300 mb-2.5" />
              <p className="text-sm font-semibold text-gray-700">No levels found</p>
              <p className="text-xs text-gray-400 mt-1">Add a new level to get started</p>
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
                    onView={() => {
                      const deptId = departmentId || departmentObj?._id || "";
                      navigate(`/show-sublevel-tables?levelId=${level._id}&subdeptId=${subdepartmentId}&deptId=${deptId}`, {
                        state: { level, subdepartment, departmentId: deptId, departmentName }
                      });
                    }}
                    onDelete={
                      hasPermission('Page_Level', 'delete')
                        ? () => setLevelToDelete(level)
                        : null
                    }
                    onEdit={
                      hasPermission('Page_Level', 'update')
                        ? () => setEditingLevel(level)
                        : null
                    }
                  />
                )}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit Level Drawer */}
      <OrangeButton
        isOpen={Boolean(editingLevel)}
        onClose={() => setEditingLevel(null)}
        panelTitle="Edit Level"
        panelSubtitle={editingLevel ? `Editing: ${editingLevel.name}` : ""}
        leftBtnText="Cancel"
        rightBtnText="Update Level"
        onLeftClick={() => setEditingLevel(null)}
        onRightClick={() => editLevelFormRef.current?.submitForm()}
        drawerContent={
          editingLevel && (
            <Formik
              innerRef={editLevelFormRef}
              initialValues={{
                name: editingLevel.name || "",
                order: editingLevel.order ?? "",
                isActive: editingLevel.isActive ?? true,
              }}
              validationSchema={validationSchema}
              enableReinitialize
              onSubmit={async (values, { setSubmitting, resetForm }) => {
                try {
                  await updateLevel({
                    levelId: editingLevel._id,
                    name: values.name,
                    order: Number(values.order),
                    subDepartmentId: subdepartmentId,
                    isActive: values.isActive,
                  }).unwrap();
                  toast.success("Level updated successfully!");
                  resetForm();
                  setEditingLevel(null);
                  refetch();
                } catch (error) {
                  toast.error(error?.data?.message || "Error updating level");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4">
                  <InputField label="Level Name" name="name" placeholder="Enter level name" />
                  <InputField label="Order" name="order" type="number" placeholder="Enter order number" />
                  <RadioGroup label="Status" name="isActive" required={false} />
                </Form>
              )}
            </Formik>
          )
        }
      />

      {/* Delete Level Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(levelToDelete)}
        onClose={() => setLevelToDelete(null)}
        onConfirm={handleDeleteLevel}
        title="Delete Level"
        itemName={levelToDelete ? `${levelToDelete.name} (Order: ${levelToDelete.order})` : ""}
        message="Are you sure you want to delete this level? Students and sublevels linked to this level may be affected."
        confirmText="Delete Level"
        isLoading={isDeletingLevel}
      />
    </>
  );
};

export default SubdepartmentDetails;
