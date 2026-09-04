/* eslint-disable react/prop-types */
// components/DatePickerInput.js
import { useField, ErrorMessage } from 'formik';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useState } from 'react';
import './DatePickerInput.css';

const DatePickerInput = ({ label, name, className = '', disabled = false }) => {
  const [field, , helpers] = useField(name);
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = !!field.value;

  return (
    <div className={`relative w-full ${className}`}>
      <DatePicker
        selected={field.value ? new Date(field.value) : null}
        onChange={(date) => {
          helpers.setValue(date);
          helpers.setTouched(true);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          helpers.setTouched(true);
        }}
        maxDate={new Date()} // Allow previous and current dates only
        dateFormat="dd/MM/yyyy"
        className={`peer h-12 w-full border border-gray-300 rounded-md px-3 pt-5 pb-2
          leading-tight focus:outline-none focus:border-orange-400 focus:ring-0
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} transition-all duration-200
        `}
        disabled={disabled}
        placeholderText="Select Date"
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        calendarClassName="custom-datepicker"
        popperClassName="custom-datepicker-popper"
      />

      <label
        className={`
          absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none
          ${isFocused || hasValue
            ? 'text-xs -top-2 text-black'
            : 'text-gray-500 top-3.5'
          }
        `}
      >
        {label}
      </label>

      <ErrorMessage name={name} component="p" className="text-red-500 text-sm font-semibold mt-1" />
    </div>
  );
};

export default DatePickerInput;