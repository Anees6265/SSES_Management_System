/* eslint-disable react/prop-types */
import { useField } from "formik";

const RadioGroup = ({ label, name, required = true }) => {

  // built-in validation function
  const validate = (value) => {
    if (required && (value === undefined || value === null)) {
      return "Status is required";
    }
  };

  const [field, meta, helpers] = useField({ name, validate });
  const { value } = field;
  const { setValue, setTouched } = helpers;

  const handleToggle = () => {
    setValue(!value);
    setTouched(true);
  };

  return (
    <div>
      {/* label */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className={`relative w-14 h-8 flex items-center rounded-full transition-all duration-300
            ${value ? "bg-orange-500" : "bg-gray-300"}
          `}
        >
          <span
            className={`absolute w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300
              ${value ? "translate-x-7" : "translate-x-1"}
            `}
          />
        </button>

        <span className="text-sm font-medium text-gray-700">
          {value ? "Active" : "Inactive"}
        </span>
      </div>

      {/* validation error */}
      {meta.touched && meta.error && (
        <p className="text-red-500 text-sm font-semibold mt-1">
          {meta.error}
        </p>
      )}
    </div>
  );
};

export default RadioGroup;


// /* eslint-disable react/prop-types */
// // eslint-disable-next-line no-unused-vars
// import React from "react";
// import { Field, ErrorMessage } from "formik";

// const RadioGroup = ({ label, name, options }) => (
//   <div>
//     <label className="block text-sm font-medium text-gray-700">
//       {label} <span className="text-red-500">*</span>
//     </label>
//     <div className="mt-2 space-x-8">
//       {options.map((opt) => (
//         <label key={opt.value} className="inline-flex items-center">
//           <Field
//             type="radio"
//             name={name}
//             value={opt.value}
//             className="form-radio h-4 w-4 text-red-600 accent-red-600 border-gray-300"
//           />
//           <span className="ml-2">{opt.label}</span>
//         </label>
//       ))}
//     </div>
//     <ErrorMessage
//       name={name}
//       component="p"
//       className="text-red-500 text-sm font-semibold"
//     />
//   </div>
// );

// export default RadioGroup;
