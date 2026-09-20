import { toast } from "react-toastify";

/**
 * Replaces native window.confirm() with an interactive React-Toastify prompt.
 * Returns a Promise that resolves to true (Confirm) or false (Cancel).
 *
 * @param {string} message - Confirmation message to display
 * @param {object} options - Optional customization { confirmText, cancelText, confirmButtonClass }
 * @returns {Promise<boolean>}
 */
export const confirmToast = (message, options = {}) => {
  const {
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmButtonClass = "bg-orange-500 hover:bg-orange-600 text-white",
  } = options;

  return new Promise((resolve) => {
    let resolved = false;

    toast(
      ({ closeToast }) => (
        <div className="flex flex-col gap-2.5 py-1 text-left">
          <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug whitespace-pre-line">
            {message}
          </p>
          <div className="flex justify-end items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => {
                resolved = true;
                closeToast();
                resolve(false);
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                resolved = true;
                closeToast();
                resolve(true);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition shadow-xs ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
        onClose: () => {
          if (!resolved) {
            resolve(false);
          }
        },
      }
    );
  });
};

export default confirmToast;
