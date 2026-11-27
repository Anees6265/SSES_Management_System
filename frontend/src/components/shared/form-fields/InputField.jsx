import { useField } from "formik";
import { Field, ErrorMessage } from "formik";
import SelectDropdown from "./SelectDropdown";

const InputFieldCore = ({
  label,
  name,
  type = "text",
  options = [],
  placeholder = "",
  disabled = false,
  className = "",
  maxLength,
  onInput,
  field,
  helpers,
  isFormikControlled,
  onChange,
  usePortal = true,
  direction = "auto",
  menuClassName = "",
  buttonClassName = "",
  align = "left",
  ...rest
}) => {
  const baseInputStyle = `
    w-full h-11 px-3 rounded-lg
    border border-gray-200
    bg-gray-50
    text-sm text-gray-700
    focus:outline-none focus:border-orange-400 focus:bg-white
    transition
    ${disabled ? "cursor-not-allowed opacity-70" : ""}
  `;

  const selectOptions = placeholder
    ? [{ value: "", label: placeholder }, ...options]
    : options;

  return (
    <div className={`w-full ${className}`}>
      {/* label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      {/* ================= TEXTAREA ================= */}
      {type === "textarea" && (
        <textarea
          {...field}
          {...rest}
          maxLength={maxLength}
          onInput={onInput}
          disabled={disabled}
          placeholder={placeholder}
          className={`${baseInputStyle} h-24 resize-none`}
        />
      )}

      {/* ================= SELECT ================= */}
      {type === "select" && (
        <SelectDropdown
          value={field.value}
          onChange={(val) => {
            if (isFormikControlled && helpers?.setValue) {
              helpers.setValue(val);
            } else if (onChange) {
              onChange({ target: { name, value: val } });
            }
          }}
          options={selectOptions}
          placeholder={placeholder || `Select ${label || ''}`}
          disabled={disabled}
          direction={direction}
          usePortal={usePortal}
          menuClassName={menuClassName}
          buttonClassName={
            buttonClassName ||
            `w-full h-11 flex items-center justify-between gap-2 px-3 border border-gray-200 hover:border-orange-400 bg-gray-50 hover:bg-white rounded-lg text-sm text-gray-700 font-medium transition ${
              disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`
          }
          align={align}
        />
      )}

      {/* ================= NORMAL INPUT ================= */}
      {type !== "select" && type !== "textarea" && (
        isFormikControlled ? (
          <Field
            {...field}
            {...rest}
            maxLength={maxLength}
            onInput={onInput}
            type={type}
            disabled={disabled}
            placeholder={placeholder}
            className={baseInputStyle}
          />
        ) : (
          <input
            {...field}
            {...rest}
            maxLength={maxLength}
            onInput={onInput}
            type={type}
            disabled={disabled}
            placeholder={placeholder}
            className={baseInputStyle}
          />
        )
      )}

      {/* error */}
      {isFormikControlled && (
        <ErrorMessage name={name} component="p" className="text-red-500 text-xs mt-1" />
      )}
    </div>
  );
};

const FormikInputField = (props) => {
  const [field, meta, helpers] = useField(props.name);
  return (
    <InputFieldCore
      {...props}
      field={field}
      meta={meta}
      helpers={helpers}
      isFormikControlled={true}
    />
  );
};

const ControlledInputField = (props) => {
  const field = {
    name: props.name,
    value: props.value !== undefined ? props.value : "",
    onChange: props.onChange
  };
  return (
    <InputFieldCore
      {...props}
      field={field}
      meta={{}}
      helpers={{}}
      isFormikControlled={false}
    />
  );
};

const InputField = (props) => {
  const isFormikControlled = props.value === undefined && props.onChange === undefined;
  if (isFormikControlled) {
    return <FormikInputField {...props} />;
  }
  return <ControlledInputField {...props} />;
};

export default InputField;
