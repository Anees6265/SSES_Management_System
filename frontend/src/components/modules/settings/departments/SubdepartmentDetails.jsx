import { useState, useEffect } from "react";
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
import { MdLayers, MdSearch, MdClose, MdDelete, MdWarning } from "react-icons/md";
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
            <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 mt-1 rounded-full ${
              level.isActive 
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
              onClick={onDelete}
              title="Delete Level"
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors flex items-center justify-center cursor-pointer"
            >
              <MdDelete size={16} />
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

      {/* Action buttons at the bottom (aligned to bottom) */}
      <div className="flex items-center gap-2.5 sm:gap-3 mt-auto pt-3 sm:pt-4 border-t border-slate-100">
        <button
          onClick={onView}
          className="flex-1 py-2.5 sm:py-2 text-xs font-bold text-gray-700 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border border-slate-200/70 rounded-xl transition duration-150 cursor-pointer text-center"
        >
          View
        </button>
        {onEdit && (
          <div className="flex-1">
            {onEdit}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [levelToDelete, setLevelToDelete] = useState(null);

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

  const subdepartment  = subdepartmentData?.data || location.state?.subdepartment;
  const departmentObj  = typeof subdepartment?.departmentId === "object" ? subdepartment?.departmentId : null;
  const departmentId   = location.state?.departmentId || departmentObj?._id || (typeof subdepartment?.departmentId === "string" ? subdepartment?.departmentId : "");

  const { data: levelsData, isLoading: isLevelsLoading, refetch } = useGetLevelsBySubdepartmentQuery(subdepartmentId, { skip: !subdepartmentId });
  const [addLevel] = useAddLevelMutation();
  const [updateLevel] = useUpdateLevelMutation();
  const [deleteLevel, { isLoading: isDeletingLevel }] = useDeleteLevelMutation();

  const departmentName = location.state?.departmentName || departmentObj?.name || "Department";
  
  // Sort levels: Active levels first, then by ascending numeric order (e.g. Level 1, Level 2)
  const levels = [...(levelsData?.data || [])].sort((a, b) => {
    if (b.isActive !== a.isActive) {
      return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
    }
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  });

  const filteredLevels = levels.filter((lvl) =>
    lvl.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="px-3.5 sm:px-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 sm:py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{subdepartment.name}</h1>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-200/60 rounded-full">
                {levels.length} {levels.length === 1 ? "Level" : "Levels"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage levels and academic curriculum</p>
          </div>

          {levels.length > 1 && (
            <div className="relative w-full sm:w-64">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search levels..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-gray-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
                >
                  <MdClose size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-3">
            <span>
              Showing {filteredLevels.length} of {levels.length} levels
            </span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-orange-500 hover:text-orange-600 font-semibold cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-6 mt-3.5 sm:mt-5">
          {filteredLevels.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
              <MdLayers size={44} className="mx-auto text-gray-300 mb-2.5" />
              <p className="text-sm font-semibold text-gray-700">
                {searchQuery ? `No levels matching "${searchQuery}"` : "No levels found"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? "Try clearing your search filter" : "Add a new level to get started"}
              </p>
            </div>
          ) : (
            filteredLevels.map((level) => (
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
                              customButtonClass="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white rounded-xl py-2.5 sm:py-2 text-xs font-bold transition duration-150 cursor-pointer shadow-2xs"
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

      {/* Delete Level Confirmation Modal */}
      {levelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-100">
                <MdWarning size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Level</h3>
                <p className="text-xs text-gray-500">This action will deactivate the level.</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 uppercase">"{levelToDelete.name}"</strong> (Order: {levelToDelete.order})? Students and sublevels linked to this level may be affected.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLevelToDelete(null)}
                disabled={isDeletingLevel}
                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLevel}
                disabled={isDeletingLevel}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingLevel ? "Deleting..." : "Delete Level"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubdepartmentDetails;
