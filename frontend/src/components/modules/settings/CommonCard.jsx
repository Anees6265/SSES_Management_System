import { MdBusiness } from 'react-icons/md';

const ActionButtons = ({ onView, onEdit, inactive }) => (
  <div className="flex gap-3 px-5 pb-5 mt-auto">
    {onView && (
      <button
        onClick={inactive ? undefined : onView}
        disabled={inactive}
        className={`flex-1 border rounded-xl py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-[0.97] ${
          inactive
            ? 'border-gray-150 bg-gray-50 text-gray-300 cursor-not-allowed'
            : 'border-gray-200 text-gray-700 hover:bg-slate-50 hover:border-gray-400 cursor-pointer shadow-2xs hover:shadow-xs'
        }`}
      >
        VIEW
      </button>
    )}
    {onEdit && (
      <div className={`${onView ? 'flex-1' : 'w-full'} ${inactive ? 'opacity-40 pointer-events-none' : ''} [&_button]:!w-full [&_button]:!h-full [&_button]:!py-2.5 [&_button]:!text-xs [&_button]:!font-bold [&_button]:!tracking-wider [&_button]:!uppercase [&_button]:!rounded-xl [&_button]:!transition-all [&_button]:!duration-200 [&_button]:active:scale-[0.97] [&_button]:!shadow-xs [&_button]:!bg-orange-500 [&_button]:!text-white [&_button]:hover:!bg-orange-600`}>
        {onEdit}
      </div>
    )}
  </div>
);

const CommonCard = ({
  icon: Icon = MdBusiness,
  logo,
  title,
  description,
  status,
  statusLabel,
  infoItems,
  onView,
  onEdit,
  children,
  variant = 'card2',
}) => {
  const inactive = status === false;

  // card1 — icon + title side by side, status badge below title, single-row info, VIEW + EDIT buttons
  if (variant === 'card1') {
    return (
      <div className={`bg-gradient-to-b from-white to-slate-50/20 border rounded-2xl shadow-xs transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col ${
        inactive ? 'border-gray-150' : 'border-gray-200 hover:shadow-md hover:border-orange-300'
      }`}>
        {!inactive && <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-amber-500 flex-shrink-0" />}
        <div className="p-5 flex-1">

          {/* Icon + Title + Status */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs border ${
              inactive ? 'bg-gray-100 border-gray-200' : 'bg-gradient-to-tr from-orange-50 to-amber-50/50 border-orange-100'
            }`}>
              <Icon size={24} className={inactive ? 'text-gray-400' : 'text-orange-500'} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-sm font-extrabold tracking-tight leading-tight truncate ${inactive ? 'text-gray-455' : 'text-gray-900'}`}>
                {title}
              </h3>
              <span className={`mt-1.5 inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                inactive 
                  ? 'bg-slate-50 text-slate-400 border-slate-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {!inactive && (
                  <span className="relative flex h-1.5 w-1.5 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                )}
                {statusLabel || (inactive ? 'Inactive' : 'Active')}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className={`border-t mb-4 ${inactive ? 'border-gray-150' : 'border-slate-100/70'}`} />

          {/* Info — single row as neat metric badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mb-2">
            {infoItems?.map((item, i) => (
              <span key={i} className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition hover:scale-105 shadow-2xs ${
                inactive 
                  ? 'bg-slate-50 text-slate-400 border-slate-200' 
                  : 'bg-slate-50/70 text-slate-650 border-slate-100/80 hover:bg-white hover:border-orange-150'
              }`}>
                {item.icon && <span className={inactive ? 'text-gray-400 [&_svg]:text-gray-400' : 'text-orange-500/85'}>{item.icon}</span>}
                {item.label && item.value ? (
                  <>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.label}:</span>
                    <span className={`font-extrabold ${inactive ? 'text-gray-455' : 'text-gray-800'}`}>{item.value}</span>
                  </>
                ) : (
                  <span className={`font-extrabold ${inactive ? 'text-gray-455' : 'text-gray-800'}`}>
                    {item.value || item.label}
                  </span>
                )}
              </span>
            ))}
          </div>

          {children}
        </div>

        <ActionButtons onView={onView} onEdit={onEdit} inactive={inactive} />
      </div>
    );
  }

  // card2 — icon + status badge top row, title with more space, description, divider, info list, VIEW + EDIT
  return (
    <div className={`bg-gradient-to-b from-white to-slate-50/20 border rounded-2xl shadow-xs transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col ${
      inactive ? 'border-gray-150' : 'border-gray-250 hover:shadow-md hover:border-orange-300'
    }`}>
      {/* Top Accent Gradient Line */}
      {!inactive && <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-amber-500 flex-shrink-0" />}
      
      <div className="p-5 flex-1 flex flex-col">

        {/* Top row: icon/logo + status badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs border ${
            inactive 
              ? 'bg-gray-100 border-gray-250' 
              : 'bg-gradient-to-tr from-orange-50 to-amber-50/50 border-orange-100'
          }`}>
            {logo
              ? <img src={logo} alt={title} className="w-full h-full object-cover" />
              : <Icon size={24} className={inactive ? 'text-gray-400' : 'text-orange-500'} />
            }
          </div>
          {status !== undefined && (
            <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              inactive 
                ? 'bg-slate-50 text-slate-400 border-slate-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
              {!inactive && (
                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              )}
              {statusLabel || (inactive ? 'INACTIVE' : 'ACTIVE')}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={`text-base sm:text-lg font-extrabold mb-1 min-h-[2.5rem] tracking-tight leading-snug ${
          inactive ? 'text-gray-400' : 'text-gray-900'
        }`}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className={`text-xs min-h-[3rem] font-medium leading-relaxed line-clamp-2 mb-3.5 ${
            inactive ? 'text-gray-400' : 'text-gray-500'
          }`}>{description}</p>
        )}

        {/* Divider */}
        <div className={`border-t my-4 ${inactive ? 'border-gray-150' : 'border-slate-100/70'}`} />

        {/* Redesigned Info Items Grid with individual cards */}
        {infoItems && infoItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4 mt-auto">
            {infoItems.map((item, i) => (
              <div key={i} className={`border rounded-xl p-2.5 flex items-center gap-2.5 transition-all duration-200 ${
                inactive 
                  ? 'bg-gray-50 border-gray-150' 
                  : 'bg-slate-50/50 border-slate-100/75 hover:bg-white hover:border-orange-100 hover:shadow-xs'
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  inactive 
                    ? 'bg-gray-100 border-gray-200 text-gray-450' 
                    : 'bg-gradient-to-tr from-orange-50 to-amber-50 border-orange-100/40 text-orange-500'
                }`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">
                    {item.label}
                  </span>
                  <span className={`text-xs font-black truncate block ${
                    inactive ? 'text-gray-455' : 'text-gray-800'
                  }`}>
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>

      <ActionButtons onView={onView} onEdit={onEdit} inactive={inactive} />
    </div>
  );
};

export default CommonCard;
