const StatsCard = ({ title, value, subtitle, icon, color = "orange" }) => {
  const colorMap = {
    orange: "bg-orange-50 text-orange-500 border-orange-100",
    blue:   "bg-blue-50 text-blue-500 border-blue-100",
    green:  "bg-green-50 text-green-500 border-green-100",
    purple: "bg-purple-50 text-purple-500 border-purple-100",
    red:    "bg-red-50 text-red-500 border-red-100",
  };


  return (
    <div className={`bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm ${colorMap[color]}`}>
      {icon && (
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorMap[color]}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value ?? "—"}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};


export default StatsCard;