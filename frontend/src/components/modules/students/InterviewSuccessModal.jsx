/* eslint-disable react/prop-types */
import { useEffect } from 'react';
import OrangeButton from '../../shared/sidebar/OrangeButton';

const InterviewSuccessModal = ({ isOpen, onClose, studentName, currentLevel, nextLevel, result }) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    const getResultIcon = () => {
        switch (result) {
            case 'Pass':
                return '✅';
            case 'Fail':
                return '❌';
            default:
                return '⏳';
        }
    };

    const getResultColor = () => {
        switch (result) {
            case 'Pass':
                return 'text-green-600';
            case 'Fail':
                return 'text-red-600';
            default:
                return 'text-amber-600';
        }
    };

    const getProgressMessage = () => {
        if (result === 'Pass') {
            return `${currentLevel} → ${nextLevel}`;
        } else if (result === 'Fail') {
            return `Remains at ${currentLevel}`;
        } else {
            return `Status: ${result}`;
        }
    };

    return (
        <OrangeButton
            isOpen={isOpen}
            onClose={onClose}
            panelTitle="Interview Result"
            panelSubtitle={studentName || "Candidate status update"}
            showFooter={false}
            drawerContent={
                <div className="text-center py-6 space-y-6">
                    <div className="text-6xl">
                        {getResultIcon()}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-800">
                        {studentName}
                    </h2>
                    
                    <p className={`text-lg font-semibold ${getResultColor()}`}>
                        Interview {result}
                    </p>
                    
                    <div className="bg-orange-50/70 border border-orange-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Level Progress</p>
                        <p className="text-lg font-bold text-gray-800">
                            {getProgressMessage()}
                        </p>
                    </div>
                    
                    <p className="text-xs text-gray-400">
                        This panel will close automatically in 5 seconds
                    </p>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition"
                    >
                        Close
                    </button>
                </div>
            }
        />
    );
};

export default InterviewSuccessModal;