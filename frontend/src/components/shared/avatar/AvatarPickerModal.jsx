/* eslint-disable react/prop-types */
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  FiCheck, 
  FiX, 
  FiCamera, 
  FiSearch, 
  FiUser, 
  FiTrash2,
  FiLoader
} from "react-icons/fi";
import { 
  IoSparkles, 
  IoShuffleOutline,
  IoCloudDoneOutline
} from "react-icons/io5";
import { 
  AVATAR_LIST, 
  BACKGROUND_PALETTES, 
  AVATAR_CATEGORIES, 
  getAvatarCompositeDataUri 
} from "../../../utils/avatarCatalog";

export default function AvatarPickerModal({
  isOpen,
  onClose,
  onSelectAvatar,
  onUploadPhotoClick,
  onRemovePhoto,
  currentImage = "",
  userName = "User",
  userRole = "Staff"
}) {
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => AVATAR_LIST[0].id);
  const [selectedBgId, setSelectedBgId] = useState("orange");
  const [activeCategory, setActiveCategory] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all"); // "all" | "male" | "female"
  const [searchQuery, setSearchQuery] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  // Active background theme object
  const activeBg = useMemo(() => {
    return BACKGROUND_PALETTES.find((b) => b.id === selectedBgId) || BACKGROUND_PALETTES[0];
  }, [selectedBgId]);

  // Selected avatar object
  const selectedAvatar = useMemo(() => {
    return AVATAR_LIST.find((a) => a.id === selectedAvatarId) || AVATAR_LIST[0];
  }, [selectedAvatarId]);

  // Filtered avatars based on category, gender, and search query
  const filteredAvatars = useMemo(() => {
    return AVATAR_LIST.filter((avatar) => {
      // Category filter
      if (activeCategory !== "all" && avatar.category !== activeCategory) {
        return false;
      }
      // Gender filter
      if (genderFilter !== "all" && avatar.gender !== genderFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = avatar.name.toLowerCase().includes(q);
        const matchRole = (avatar.roleTag || "").toLowerCase().includes(q);
        const matchCat = (avatar.category || "").toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchCat) return false;
      }
      return true;
    });
  }, [activeCategory, genderFilter, searchQuery]);

  // Random avatar generator ("Surprise Me")
  const handleRandomize = () => {
    const randomAvatar = AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)];
    const randomBg = BACKGROUND_PALETTES[Math.floor(Math.random() * BACKGROUND_PALETTES.length)];
    setSelectedAvatarId(randomAvatar.id);
    setSelectedBgId(randomBg.id);
  };

  // Submit selected avatar
  const handleApply = async () => {
    try {
      setIsApplying(true);
      const dataUriOrUrl = await getAvatarCompositeDataUri(selectedAvatar, activeBg);
      onSelectAvatar(dataUriOrUrl);
      onClose();
    } catch (err) {
      console.error("Failed to apply avatar:", err);
      onSelectAvatar(selectedAvatar.src || "");
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  // Teleport modal straight to document.body to escape any drawer or parent transforms
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Modal Dialog Box */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl sm:max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* ── 1. MODAL HEADER (Always Fixed at Top) ── */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-amber-50/20 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <IoSparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                  Choose Profile Avatar
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <IoCloudDoneOutline size={11} />
                  <span>Cloud CDN</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Select an avatar for {userName || "your profile"}{userRole ? ` (${userRole})` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
            title="Close dialog"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* ── 2. MODAL BODY (Scrollable Inside Only) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Active Preview & Customization Card */}
          <div className="bg-gradient-to-br from-slate-50 via-white to-orange-50/20 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 shadow-2xs">
            {/* Live Large Preview */}
            <div className="relative shrink-0">
              <div 
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-md ring-4 ring-orange-500/20 overflow-hidden transition-all duration-300 flex items-center justify-center"
                style={{
                  background: selectedAvatar.hasTransparentBg
                    ? `linear-gradient(135deg, ${activeBg.from}, ${activeBg.to})`
                    : "#0f172a"
                }}
              >
                {selectedAvatar.type === "svg" ? (
                  <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{
                      __html: selectedAvatar.getSvg(activeBg)
                    }}
                  />
                ) : (
                  <img
                    src={selectedAvatar.src}
                    alt={selectedAvatar.name}
                    className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 ${
                      selectedAvatar.hasTransparentBg ? "scale-90" : "scale-100"
                    }`}
                  />
                )}
              </div>
              
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md border-2 border-white">
                <FiCheck size={11} />
              </span>
            </div>

            {/* Avatar Details & Color Selector */}
            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {selectedAvatar.name}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  {selectedAvatar.roleTag}
                </span>
                {selectedAvatar.category === "pixar" && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    ✨ 3D Pixar
                  </span>
                )}
              </div>

              {/* Background Color Swatches */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[11px] font-medium text-slate-600">
                    Background Color: <strong className="text-slate-900 font-bold">{activeBg.name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleRandomize}
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition hover:underline px-2 py-0.5 rounded-md hover:bg-orange-50"
                  >
                    <IoShuffleOutline size={13} />
                    <span>Surprise Me</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                  {BACKGROUND_PALETTES.map((palette) => {
                    const isSelected = palette.id === selectedBgId;
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => setSelectedBgId(palette.id)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center shadow-2xs ${
                          isSelected
                            ? "ring-2 ring-orange-500 ring-offset-2 scale-110"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`
                        }}
                        title={palette.name}
                      >
                        {isSelected && <FiCheck className="text-white text-[10px] drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Filter & Search Bar ── */}
          <div className="space-y-2">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {AVATAR_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? "bg-orange-500 text-white shadow-xs font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Sub-Filters: Gender & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Gender Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl shrink-0 self-start sm:self-auto">
                {[
                  { id: "all", label: "All" },
                  { id: "male", label: "Men" },
                  { id: "female", label: "Women" }
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGenderFilter(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      genderFilter === g.id
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search avatars (e.g. Pixar, Dean, Faculty, Tech)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <FiX size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Avatar Grid ── */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 sm:gap-3 max-h-[320px] overflow-y-auto p-1">
            {filteredAvatars.map((avatar) => {
              const isSelected = avatar.id === selectedAvatarId;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatarId(avatar.id)}
                  title={`${avatar.name} (${avatar.roleTag})`}
                  className={`group relative rounded-2xl p-2 text-center flex flex-col items-center gap-1.5 border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-orange-50/70 border-orange-500 shadow-sm ring-2 ring-orange-500/30 scale-102"
                      : "bg-white hover:bg-slate-50 border-slate-200 hover:border-orange-200 hover:shadow-2xs"
                  }`}
                >
                  {/* Avatar Circular Thumbnail */}
                  <div 
                    className="w-13 h-13 sm:w-15 sm:h-15 rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-105 shadow-2xs flex items-center justify-center shrink-0"
                    style={{
                      background: avatar.hasTransparentBg
                        ? `linear-gradient(135deg, ${activeBg.from}, ${activeBg.to})`
                        : "#0f172a"
                    }}
                  >
                    {avatar.type === "svg" ? (
                      <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{
                          __html: avatar.getSvg(activeBg)
                        }}
                      />
                    ) : (
                      <img
                        src={avatar.src}
                        alt={avatar.name}
                        className={`w-full h-full object-cover select-none pointer-events-none ${
                          avatar.hasTransparentBg ? "scale-90" : "scale-100"
                        }`}
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Selection Badge */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4.5 h-4.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] shadow-sm animate-in zoom-in-75">
                      <FiCheck size={10} />
                    </div>
                  )}

                  {/* Clean Single Label */}
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 truncate w-full text-center leading-tight">
                    {avatar.name}
                  </span>
                </button>
              );
            })}

            {filteredAvatars.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-400 space-y-1.5">
                <FiUser size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No avatars match your search criteria</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("all");
                    setGenderFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. MODAL FOOTER (Always Fixed at Bottom) ── */}
        <div className="px-5 py-3 sm:px-6 border-t border-slate-100 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Alternative Actions: Upload Real Photo or Remove */}
          <div className="flex items-center gap-2 flex-wrap">
            {onUploadPhotoClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onUploadPhotoClick();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FiCamera size={13} className="text-slate-500" />
                <span>Upload Photo Instead</span>
              </button>
            )}

            {currentImage && onRemovePhoto && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRemovePhoto();
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <FiTrash2 size={12} />
                <span>Reset Photo</span>
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <FiLoader size={13} className="animate-spin" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <FiCheck size={13} />
                  <span>Apply Avatar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
