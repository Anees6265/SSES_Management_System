

import * as Yup from "yup";

export const loginValidationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export const signupValidationSchema = Yup.object({
  firstName: Yup.string().required("First Name is required"),
  lastName: Yup.string().required("Last Name is required"),
  gender: Yup.string().required("Gender is required"),
  contactNumber: Yup.string()
    .required("Contact Number is required")
    .matches(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian number"),
  address: Yup.string().required("Address is required"),
  fathersName: Yup.string().required("Father's Name is required"),
  fathersContact: Yup.string()
    .required("Father's Contact is required")
    .matches(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian number"),
  track: Yup.string().required("Track is required"),
  twelfthSubject: Yup.string().required("12th Subject is required"),
  twelfthPercentage: Yup.number()
    .required("12th Percentage is required")
    .min(0, "Too low")
    .max(100, "Too high"),
  tenthPercentage: Yup.number()
    .required("10th Percentage is required")
    .min(0, "Too low")
    .max(100, "Too high"),
  twelfthPassoutYear: Yup.string().required("12th Passout Year is required"),
  courseOrDiploma: Yup.string().required("Required"),
});



export const interviewSchema = Yup.object({
  firstName: Yup.string().required("Required"),
  lastName: Yup.string().required("Required"),
  contact: Yup.string().required("Required"),
  fatherName: Yup.string().required("Required"),
  gender: Yup.string().required("Select gender"),
  track: Yup.string().required("Select track"),
  address: Yup.string().required("Required"),
  subject12: Yup.string().required("Required"),
  percent12: Yup.string().required("Required"),
  percent10: Yup.string().required("Required"),
  passOut: Yup.date().required("Required"),
  course: Yup.string().required("Select course"),
  marks: Yup.number().required("Required"),
  remark: Yup.string().required("Required"),
  attempt: Yup.number().required("Required"),
  examDate: Yup.date().required("Required"),
});

export const resetPasswordValidationSchema = Yup.object({
  password: Yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmpassword: Yup.string()
    .required("Confirm password is required")
    .oneOf([Yup.ref("password")], "Passwords must match"),
});
