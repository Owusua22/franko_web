// components/Notification.jsx
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

const Notification = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, type === "info" ? 6000 : 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, message, type]);

  if (!isVisible) return null;

  const bgColor = type === "success" ? "bg-green-500" : type === "info" ? "bg-amber-600" : "bg-red-500";
  const Icon = type === "success" ? CheckCircleIcon : type === "info" ? InformationCircleIcon : XCircleIcon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in" role="status" aria-live="polite">
      <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[300px]`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white/80 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
