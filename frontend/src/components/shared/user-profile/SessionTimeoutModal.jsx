/* eslint-disable react/prop-types */
import OrangeButton from '../sidebar/OrangeButton';

const SessionTimeoutModal = ({ isOpen, onContinue, onLogout, isExtending }) => {
  return (
    <OrangeButton
      isOpen={isOpen}
      onClose={onLogout}
      panelTitle="Session Timeout Warning"
      panelSubtitle="Your session will expire in 2 minutes"
      leftBtnText="Logout"
      rightBtnText={isExtending ? "Extending..." : "Continue Session"}
      onLeftClick={onLogout}
      onRightClick={onContinue}
      drawerContent={
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 mx-auto bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Your session is about to expire. Click <strong>Continue Session</strong> to extend your session and keep working, or Logout to exit.
          </p>
        </div>
      }
    />
  );
};

export default SessionTimeoutModal;