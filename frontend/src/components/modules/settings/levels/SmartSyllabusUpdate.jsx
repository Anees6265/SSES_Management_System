/* eslint-disable react/prop-types */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { 
  useUpdateSyllabusSmartlyMutation, 
  usePreviewUpdateImpactMutation,
  useGetAffectedStudentsQuery 
} from '../../../../redux/api/authApi';
import { FaLock, FaSync, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import OrangeButton from '../../../shared/sidebar/OrangeButton';

const SmartSyllabusUpdate = ({ sessionId, subLevelId, currentSyllabus, onClose, onSuccess }) => {
  const [updateData, setUpdateData] = useState({
    title: currentSyllabus?.title || '',
    subjects: currentSyllabus?.subjects || [],
    changeLog: ''
  });
  const [showPreview, setShowPreview] = useState(false);

  const [updateSyllabus, { isLoading: updating }] = useUpdateSyllabusSmartlyMutation();
  const [previewImpact, { isLoading: previewing }] = usePreviewUpdateImpactMutation();
  const { data: affectedStudents } = useGetAffectedStudentsQuery(
    { sessionId, subLevelId },
    { skip: !showPreview }
  );

  const handlePreview = async () => {
    try {
      await previewImpact({ sessionId, subLevelId }).unwrap();
      setShowPreview(true);
      toast.success('Impact preview loaded');
    } catch {
      toast.error('Failed to load preview');
    }
  };

  const handleUpdate = async () => {
    if (!updateData.changeLog.trim()) {
      toast.error('Please provide a change log');
      return;
    }

    try {
      const result = await updateSyllabus({
        sessionId,
        subLevelId,
        ...updateData
      }).unwrap();

      toast.success(result.message);
      onSuccess?.(result);
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to update syllabus');
    }
  };

  return (
    <OrangeButton
      isOpen={true}
      onClose={onClose}
      panelTitle="Smart Syllabus Update"
      panelSubtitle="Update syllabus while preserving completed student progress"
      leftBtnText="Cancel"
      rightBtnText={updating ? 'Updating...' : 'Update Syllabus'}
      onLeftClick={onClose}
      onRightClick={handleUpdate}
      maxWidth="sm:max-w-xl"
      drawerContent={
        <div className="space-y-6">
          {/* Update Form */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Syllabus Changes</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={updateData.title}
                  onChange={(e) => setUpdateData({ ...updateData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  placeholder="Syllabus title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Change Log <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={updateData.changeLog}
                  onChange={(e) => setUpdateData({ ...updateData, changeLog: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                  rows="3"
                  placeholder="Describe what changes you're making..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Preview Impact Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <FaEye />
              {previewing ? 'Loading Preview...' : 'Preview Impact'}
            </button>
          </div>

          {/* Impact Preview */}
          {showPreview && affectedStudents && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Update Impact Analysis</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Completed Students */}
                <div className="bg-white rounded-xl p-3 border border-green-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FaLock className="text-green-600" />
                    <h4 className="font-semibold text-xs text-green-800">Protected Students</h4>
                  </div>
                  <div className="text-xl font-bold text-green-600 mb-1">
                    {affectedStudents.data?.completed?.length || 0}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Syllabus will remain frozen.
                  </p>
                </div>

                {/* Current Students */}
                <div className="bg-white rounded-xl p-3 border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FaSync className="text-blue-600" />
                    <h4 className="font-semibold text-xs text-blue-800">Will Get Updates</h4>
                  </div>
                  <div className="text-xl font-bold text-blue-600 mb-1">
                    {affectedStudents.data?.current?.length || 0}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Will receive updated version.
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="p-2.5 bg-amber-100/70 rounded-lg">
                <p className="text-xs text-amber-900">
                  <strong>Summary:</strong> {affectedStudents.data?.completed?.length || 0} students keep original, {affectedStudents.data?.current?.length || 0} receive updates.
                </p>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default SmartSyllabusUpdate;