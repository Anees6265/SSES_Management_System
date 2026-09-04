const Avatar = ({ firstName, lastName, imageUrl, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base"
  };

  const pastelColors = [
    { bg: "bg-gradient-to-br from-pink-100 to-rose-50", text: "text-rose-700" },
    { bg: "bg-gradient-to-br from-purple-100 to-indigo-50", text: "text-indigo-700" },
    { bg: "bg-gradient-to-br from-blue-100 to-cyan-50", text: "text-cyan-700" },
    { bg: "bg-gradient-to-br from-green-100 to-emerald-50", text: "text-emerald-700" },
    { bg: "bg-gradient-to-br from-yellow-100 to-orange-50", text: "text-orange-700" },
    { bg: "bg-gradient-to-br from-red-100 to-pink-50", text: "text-pink-700" },
    { bg: "bg-gradient-to-br from-indigo-100 to-purple-50", text: "text-purple-700" },
    { bg: "bg-gradient-to-br from-teal-100 to-green-50", text: "text-green-700" },
    { bg: "bg-gradient-to-br from-orange-100 to-amber-50", text: "text-amber-700" },
    { bg: "bg-gradient-to-br from-cyan-100 to-blue-50", text: "text-blue-700" },
    { bg: "bg-gradient-to-br from-lime-100 to-green-50", text: "text-green-700" },
    { bg: "bg-gradient-to-br from-fuchsia-100 to-pink-50", text: "text-pink-700" },
  ];

  const getInitials = () => {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return `${first}${last}`;
  };

  const getColorFromName = () => {
    const name = `${firstName}${lastName}`.toLowerCase();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return pastelColors[Math.abs(hash) % pastelColors.length];
  };

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${firstName} ${lastName}`}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  const colorScheme = getColorFromName();

  return (
    <div className={`${sizeClasses[size]} rounded-full ${colorScheme.bg} flex items-center justify-center ${colorScheme.text} font-semibold`}>
      {getInitials()}
    </div>
  );
};

export default Avatar;
