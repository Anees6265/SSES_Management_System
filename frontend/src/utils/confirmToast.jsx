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
    confirmButtonClass = "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white",
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
              className="px-3 py-1.5 text-xs font-bold tracking-wider uppercase rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer"
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
              className={`px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer ${confirmButtonClass}`}
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
