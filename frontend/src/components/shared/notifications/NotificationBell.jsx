/* eslint-disable react/prop-types */
import { useState } from "react";
import { Bell } from "lucide-react";
import { useGetNotificationsQuery } from "../../../redux/api/authApi";
import NotificationDrawer from "./NotificationDrawer";

const NotificationBell = ({
  studentId = null,
  title = "Notifications",
  subtitle = "Stay updated with important announcements & alerts",
  className = "",
  iconSize = 16,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifData } = useGetNotificationsQuery(
    studentId ? { studentId } : undefined,
    {
      pollingInterval: 20000,
      refetchOnMountOrArgChange: true,
    }
  );

  const notifications = notifData?.data || [];
  const activeCount = notifications.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          "w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:text-orange-500 hover:border-orange-300 transition bg-white cursor-pointer shadow-2xs relative active:scale-95"
        }
        title={title}
        aria-label="Open notifications"
      >
        <Bell size={iconSize} />
        {activeCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        studentId={studentId}
        title={title}
        subtitle={subtitle}
      />
    </>
  );
};

export default NotificationBell;

