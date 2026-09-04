/* eslint-disable react/prop-types */
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useField } from 'formik';

const CustomDatePicker = ({ label, name, allowFuture = false }) => {
  const [field, meta, helpers] = useField(name);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      )}
      <DatePicker
        selected={field.value ? new Date(field.value) : null}
        onChange={(date) => helpers.setValue(date)}
        onBlur={() => helpers.setTouched(true)}
        maxDate={allowFuture ? null : new Date()}
        dateFormat="dd/MM/yyyy"
        placeholderText="Select date"
        wrapperClassName="w-full"
        className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:border-orange-400 focus:bg-white transition"
        dayClassName={(date) =>
          date.toDateString() === new Date().toDateString()
            ? 'react-datepicker__day--today'
            : undefined
        }
      />
      <style>{`
        .react-datepicker__day:hover { background-color: var(--primary) !important; color: white !important; border-radius: 0.3rem; }
        .react-datepicker__day--selected { background-color: var(--primary) !important; color: white !important; }
        .react-datepicker__day--keyboard-selected { background-color: var(--primary-100) !important; color: var(--primary-darker) !important; }
        .react-datepicker__day--today { border: 1px solid var(--primary) !important; border-radius: 0.3rem; }
      `}</style>
      {meta.touched && meta.error && (
        <p className="text-red-500 text-xs mt-1">{meta.error}</p>
      )}
    </div>
  );
};

export default CustomDatePicker;
