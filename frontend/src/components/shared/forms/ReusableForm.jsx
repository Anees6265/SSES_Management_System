/* eslint-disable react/prop-types */
import { Formik, Form } from "formik";

const ReusableForm = ({ initialValues, onSubmit, validationSchema, className = "bg-white p-8 rounded-lg w-full", children }) => {
  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {(formikProps) => (
        <Form className={className}>
          {children(formikProps)}
        </Form>
      )}
    </Formik>
  );
};

export default ReusableForm;

