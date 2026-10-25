import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MdClose,
  MdDeleteForever,
  MdDelete,
  MdCheckCircle,
  MdErrorOutline
} from "react-icons/md";

// Singleton event handler for programmatic confirmDelete calls
let confirmHandler = null;

/**
 * Programmatic helper to trigger the Delete Confirmation Modal from anywhere.
 * Returns a Promise that resolves to true if user typed "delete" and confirmed,
 * or false if user cancelled or closed the modal.
 *
 * @param {string|object} options - Message string or options object:
 *   { title, message, itemName, confirmText, cancelText, requiredWord }
 * @returns {Promise<boolean>}
 */
export const confirmDelete = (options = {}) => {
  if (typeof options === "string") {
    options = { message: options };
  }

  return new Promise((resolve) => {
    if (confirmHandler) {
      confirmHandler({
        ...options,
        resolve: (val) => {
          resolve(val);
        }
      });
    } else {
      // Fallback if container is not mounted yet
      console.warn("DeleteConfirmModalContainer is not mounted, fallback to window.confirm");
      const answer = window.prompt(
        `${options.message || "Are you sure you want to delete this item?"}\n\nType "delete" to confirm:`
      );
      resolve(answer?.trim().toLowerCase() === "delete");
    }
  });
};

/**
 * Standalone Declarative Modal Component
 */
export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "This action cannot be undone. All associated data will be permanently removed.",
  itemName = "",
  confirmText = "Delete",
  cancelText = "Cancel",
  requiredWord = "delete",
  isLoading = false
}) => {
  const [typedText, setTypedText] = useState("");
  const inputRef = useRef(null);

  const normalizedRequired = (requiredWord || "delete").toLowerCase();
  const isMatch = typedText.trim().toLowerCase() === normalizedRequired;

  useEffect(() => {
    if (isOpen) {
      setTypedText("");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isMatch && !isLoading) {
      onConfirm();
    }
  };

  return createPortal(
    <div
      className="drawer-no-blur fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-rose-100/80 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100/90 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-2xs">
              <MdDeleteForever size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                <MdErrorOutline size={13} />
                <span>Irreversible Action</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Cancel and close"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Target Item Highlight */}
          {itemName && (
            <div className="bg-rose-50/60 border border-rose-200/70 rounded-2xl p-3.5 text-xs text-slate-700">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                Target Record:
              </span>
              <p className="font-extrabold text-slate-900 text-sm break-words font-mono bg-white px-2.5 py-1.5 rounded-xl border border-rose-200/60 shadow-2xs">
                {itemName}
              </p>
            </div>
          )}

          {/* Description / Warning Message */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {message}
          </p>

          {/* Type 'delete' Confirmation Section */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-800">
              To proceed, please type{" "}
              <span className="font-mono bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black border border-rose-200 text-xs">
                {normalizedRequired}
              </span>{" "}
              in the input below:
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={`Type "${normalizedRequired}" to confirm`}
                className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold outline-none transition shadow-2xs ${
                  isMatch
                    ? "border-rose-500 ring-2 ring-rose-500/20 text-slate-900 bg-rose-50/20"
                    : "border-slate-200 text-slate-800 hover:border-slate-350 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
                }`}
              />
              {isMatch && (
                <span className="absolute right-3.5 top-3 text-emerald-600 flex items-center gap-1 text-xs font-bold animate-in fade-in">
                  <MdCheckCircle size={18} />
                </span>
              )}
            </div>
            {typedText && !isMatch && (
              <p className="text-[11px] font-semibold text-rose-500">
                Word does not match. Please enter "{normalizedRequired}".
              </p>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 font-bold tracking-wider uppercase text-xs transition active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer text-center"
            >
              <span>{cancelText}</span>
            </button>
            <button
              type="submit"
              disabled={!isMatch || isLoading}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold tracking-wider uppercase text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isMatch && !isLoading
                  ? "!bg-rose-600 hover:!bg-rose-700 active:!bg-rose-800 text-white shadow-xs hover:shadow-md cursor-pointer active:scale-[0.97]"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <span>Deleting...</span>
              ) : (
                <>
                  <MdDelete size={16} />
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/**
 * Global Container mounted at App root to listen to confirmDelete() calls.
 */
export const DeleteConfirmModalContainer = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "Confirm Deletion",
    message: "This action cannot be undone.",
    itemName: "",
    confirmText: "Delete",
    cancelText: "Cancel",
    requiredWord: "delete",
    resolve: null
  });

  useEffect(() => {
    confirmHandler = (params) => {
      setModalState({
        isOpen: true,
        title: params.title || "Confirm Deletion",
        message: params.message || "This action cannot be undone. Are you sure you want to delete this?",
        itemName: params.itemName || "",
        confirmText: params.confirmText || "Delete",
        cancelText: params.cancelText || "Cancel",
        requiredWord: params.requiredWord || "delete",
        resolve: params.resolve
      });
    };

    return () => {
      confirmHandler = null;
    };
  }, []);

  const handleClose = () => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <DeleteConfirmModal
      isOpen={modalState.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={modalState.title}
      message={modalState.message}
      itemName={modalState.itemName}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
      requiredWord={modalState.requiredWord}
    />
  );
};

export default DeleteConfirmModal;
