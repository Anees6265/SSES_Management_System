// Consistent button styles across the entire website matching DepartmentManagement card buttons
export const buttonStyles = {
  // Orange Edit / Primary action button
  edit: "!bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer",
  primary: "!bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer",

  // Bordered View action button
  view: "border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer",

  // Cancel button (identical to View button)
  cancel: "border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer",
  secondary: "border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer",

  // Utilities
  success: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer",
  danger: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer",
  outline: "border border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white font-bold tracking-wider uppercase rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs cursor-pointer",

  // Size variations
  primaryLarge: "!bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold tracking-wider uppercase px-4 py-3 text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer",
  primarySmall: "!bg-orange-500 hover:!bg-orange-600 active:!bg-orange-700 text-white font-bold tracking-wider uppercase px-2.5 py-1 text-xs rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs cursor-pointer",
};
