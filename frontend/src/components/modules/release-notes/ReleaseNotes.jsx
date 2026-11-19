import React, { useState, useEffect, useMemo } from "react";
import imageCompression from "browser-image-compression";
import { toast } from "react-toastify";
import api from "../../../utils/axiosInstance";
import { API_BASE_URL } from "../../../config/apiConfig";
import Pagination from "../../shared/pagination/Pagination";
import "./releaseNotes.css";

import {
  FaBullhorn,
  FaPlus,
  FaTag,
  FaCalendarAlt,
  FaCode,
  FaEdit,
  FaStar,
  FaCheckCircle,
  FaSpinner,
  FaSearchPlus,
  FaExternalLinkAlt,
  FaArchive,
  FaChartPie,
  FaShieldAlt,
  FaCloudUploadAlt,
  FaTrash,
  FaPaperPlane,
  FaSave,
  FaTimes,
  FaCheck,
} from "react-icons/fa";

const RELEASES_PER_PAGE = 5;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

const createEmptyFeature = () => ({
  title: "",
  description: "",
  imageCaption: "",
  image: "",
  imageBase64: "",
  imagePreview: "",
});

const ReleaseNotes = () => {
  // Parse user info safely
  let loggedInUser = null;
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) loggedInUser = JSON.parse(rawUser);
  } catch (_) {
    loggedInUser = null;
  }

  const loggedInUserName = (loggedInUser?.name || localStorage.getItem("userName") || "").trim();
  const loggedInUserEmail = (loggedInUser?.email || localStorage.getItem("email") || "").trim();
  const rawRole = (localStorage.getItem("role") || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  const userRole = rawRole === "cordinator" ? "coordinator" : rawRole;

  const lowerName = loggedInUserName.toLowerCase();
  const lowerEmail = loggedInUserEmail.toLowerCase();

  // Strictly permissioned to Anees Khan, Himanshu Vishwakarma, Nilesh Giri, or SuperAdmin
  const isAuthorizedCreator =
    userRole === "superadmin" ||
    userRole === "super_admin" ||
    lowerName.includes("anees") ||
    lowerName.includes("himanshu") ||
    lowerName.includes("nilesh") ||
    lowerEmail.includes("anees") ||
    lowerEmail.includes("himanshu") ||
    lowerEmail.includes("nilesh");

  const getInitialDeveloperName = () => {
    if (loggedInUserName) return loggedInUserName;
    if (loggedInUserEmail) return loggedInUserEmail.split("@")[0];
    return "Anees Khan";
  };

  const [releaseNotes, setReleaseNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [selectedArchiveMonth, setSelectedArchiveMonth] = useState("ALL");
  const [selectedArchiveYear, setSelectedArchiveYear] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReleaseId, setEditingReleaseId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate next Version Tag based on latest version
  const calculateNextVersion = (latestVer) => {
    if (!latestVer) {
      const today = new Date();
      const currentYear = today.getFullYear().toString().slice(-2);
      const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
      return `v${currentYear}.${currentMonth}`;
    }

    const match = latestVer.match(/v?(\d+)\.(\d+)/);
    if (match) {
      const major = match[1];
      const minor = parseInt(match[2], 10);
      const nextMinor = minor + 1;
      return `v${major}.${nextMinor}`;
    }
    const today = new Date();
    const currentYear = today.getFullYear().toString().slice(-2);
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    return `v${currentYear}.${currentMonth}`;
  };

  // Form State for creating a new release note
  const getInitialForm = () => {
    const today = new Date();
    const currentMonthName = MONTH_NAMES[today.getMonth()];
    const currentYearStr = String(today.getFullYear());
    const dateFormatted = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const latestVersion = releaseNotes[0]?.version || null;
    const nextVer = calculateNextVersion(latestVersion);
    const cleanVer = nextVer.replace(/^v/, "");

    return {
      version: nextVer,
      title: `Release Notes ${cleanVer}`,
      date: dateFormatted,
      selectedMonth: currentMonthName,
      selectedYear: currentYearStr,
      archiveMonth: `${currentMonthName} ${currentYearStr}`,
      developer: getInitialDeveloperName(),
      badge: "Production",
      features: [createEmptyFeature()],
      bugFixes: [""],
    };
  };

  const [formData, setFormData] = useState(getInitialForm);

  // Automatically update Title when Version Tag changes
  const handleVersionChange = (val) => {
    const clean = val.replace(/^v/, "").trim();
    setFormData((prev) => ({
      ...prev,
      version: val,
      title:
        !editingReleaseId || prev.title.startsWith("Release Notes ")
          ? clean
            ? `Release Notes ${clean}`
            : prev.title
          : prev.title,
    }));
  };

  // Fetch release notes from backend database
  const fetchReleaseNotes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/release-notes");
      if (res.data && res.data.success) {
        setReleaseNotes(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load release notes:", err?.response?.data || err.message);
      // Fallback try underscore endpoint if needed
      try {
        const fallbackRes = await api.get("/release_notes");
        if (fallbackRes.data && fallbackRes.data.success) {
          setReleaseNotes(fallbackRes.data.data || []);
          return;
        }
      } catch (_) {}
      setReleaseNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleaseNotes();
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightbox(null);
        setShowAddModal(false);
        setEditingReleaseId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock scroll when modal or lightbox is open
  useEffect(() => {
    if (lightbox || showAddModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [lightbox, showAddModal]);

  const scrollToRelease = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Form Handlers
  const handleFeatureChange = (index, field, value) => {
    const updated = [...formData.features];
    updated[index][field] = value;
    setFormData({ ...formData, features: updated });
  };

  const handleAddFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, createEmptyFeature()],
    });
  };

  const handleRemoveFeature = (index) => {
    if (formData.features.length === 1) return;
    const updated = formData.features.filter((_, idx) => idx !== index);
    setFormData({ ...formData, features: updated });
  };

  // Image Upload Handler with compression
  const handleImageUpload = async (featureIndex, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.warn("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = () => {
        const base64Data = reader.result;
        const updated = [...formData.features];
        updated[featureIndex].imageBase64 = base64Data;
        updated[featureIndex].imagePreview = base64Data;
        setFormData({ ...formData, features: updated });
      };
    } catch (error) {
      console.error("Image processing error:", error);
      toast.error("Failed to process image. Please try again.");
    }
  };

  const handleRemoveImage = (featureIndex) => {
    const updated = [...formData.features];
    updated[featureIndex].image = "";
    updated[featureIndex].imageBase64 = "";
    updated[featureIndex].imagePreview = "";
    setFormData({ ...formData, features: updated });
  };

  const handleBugFixChange = (index, value) => {
    const updated = [...formData.bugFixes];
    updated[index] = value;
    setFormData({ ...formData, bugFixes: updated });
  };

  const handleAddBugFix = () => {
    setFormData({
      ...formData,
      bugFixes: [...formData.bugFixes, ""],
    });
  };

  const handleRemoveBugFix = (index) => {
    if (formData.bugFixes.length === 1) {
      setFormData({ ...formData, bugFixes: [""] });
      return;
    }
    const updated = formData.bugFixes.filter((_, idx) => idx !== index);
    setFormData({ ...formData, bugFixes: updated });
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingReleaseId(null);
  };

  // Submit new or edited release note
  const handleSubmitReleaseNote = async (e) => {
    e.preventDefault();

    if (!formData.version.trim() || !formData.title.trim()) {
      toast.warn("Please enter Version and Release Title.");
      return;
    }

    if (!formData.developer.trim()) {
      toast.warn("Please select or enter the Developer name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        version: formData.version.trim(),
        title: formData.title.trim(),
        date: formData.date.trim(),
        archiveMonth: formData.archiveMonth.trim(),
        developer: formData.developer.trim(),
        author: formData.developer.trim(),
        badge: formData.badge.trim(),
        features: formData.features
          .filter((f) => f.title && f.title.trim())
          .map((f) => ({
            title: f.title.trim(),
            description: (f.description || "").trim(),
            imageCaption: (f.imageCaption || "").trim(),
            image: f.image || "",
            imageBase64: f.imageBase64 || undefined,
          })),
        bugFixes: formData.bugFixes.filter((b) => b && b.trim()),
      };

      const res = editingReleaseId
        ? await api.put(`/release-notes/${editingReleaseId}`, payload)
        : await api.post("/release-notes", payload);

      if (res.data && res.data.success) {
        toast.success(
          editingReleaseId
            ? "Release Note updated successfully!"
            : "Release Note published successfully!"
        );
        if (!editingReleaseId) {
          setSelectedArchiveMonth("ALL");
          setSelectedArchiveYear("ALL");
          setCurrentPage(1);
        }
        handleCloseModal();
        setFormData(getInitialForm());
        await fetchReleaseNotes();
        if (res.data.data?.id) {
          setTimeout(() => scrollToRelease(res.data.data.id), 300);
        }
      }
    } catch (err) {
      console.error("Failed to save release note:", err);
      const errMsg = err?.response?.data?.message || err.message || "Something went wrong";
      toast.error(`Error saving release note: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open modal for creating a new release note
  const handleOpenAddModal = () => {
    setEditingReleaseId(null);
    setFormData(getInitialForm());
    setShowAddModal(true);
  };

  // Open modal pre-filled to edit an existing release note
  const handleOpenEditModal = (release) => {
    const today = new Date();
    let parsedMonth = MONTH_NAMES[today.getMonth()];
    let parsedYear = String(today.getFullYear());

    if (release.archiveMonth) {
      const parts = release.archiveMonth.trim().split(/\s+/);
      if (parts.length >= 2 && MONTH_NAMES.includes(parts[0])) {
        parsedMonth = parts[0];
        parsedYear = parts[1];
      }
    }

    const mappedFeatures =
      release.features && release.features.length > 0
        ? release.features.map((f) => ({
            title: f.title || "",
            description: f.description || "",
            imageCaption: f.imageCaption || "",
            image: f.image || "",
            imageBase64: "",
            imagePreview: f.image || "",
          }))
        : [createEmptyFeature()];

    const mappedBugFixes =
      release.bugFixes && release.bugFixes.length > 0
        ? [...release.bugFixes]
        : [""];

    setFormData({
      version: release.version || "",
      title: release.title || "",
      date: release.date || "",
      selectedMonth: parsedMonth,
      selectedYear: parsedYear,
      archiveMonth: `${parsedMonth} ${parsedYear}`,
      developer: release.developer || release.author || getInitialDeveloperName(),
      badge: release.badge || "Production",
      features: mappedFeatures,
      bugFixes: mappedBugFixes,
    });

    setEditingReleaseId(release.dbId || release.id);
    setShowAddModal(true);
  };

  // Group releases by Archive Month & extract available years
  const archiveYears = useMemo(() => {
    const yearsSet = new Set();
    releaseNotes.forEach((rel) => {
      const label = rel.archiveMonth || rel.date || "";
      const match = label.match(/\b(20\d{2})\b/);
      if (match) {
        yearsSet.add(match[1]);
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [releaseNotes]);

  const archiveGroups = useMemo(() => {
    const map = new Map();
    releaseNotes.forEach((rel) => {
      const key = rel.archiveMonth || "Recent Releases";
      if (selectedArchiveYear !== "ALL") {
        if (!key.includes(selectedArchiveYear)) return;
      }
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  }, [releaseNotes, selectedArchiveYear]);

  // Filter releases by archive month & year
  const filteredReleaseNotes = useMemo(() => {
    return releaseNotes.filter((rel) => {
      if (selectedArchiveMonth !== "ALL") {
        return rel.archiveMonth === selectedArchiveMonth;
      }
      if (selectedArchiveYear !== "ALL") {
        const label = rel.archiveMonth || rel.date || "";
        return label.includes(selectedArchiveYear);
      }
      return true;
    });
  }, [releaseNotes, selectedArchiveMonth, selectedArchiveYear]);

  const totalPages = Math.max(1, Math.ceil(filteredReleaseNotes.length / RELEASES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedReleaseNotes = filteredReleaseNotes.slice(
    (safeCurrentPage - 1) * RELEASES_PER_PAGE,
    safeCurrentPage * RELEASES_PER_PAGE
  );

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectArchiveMonth = (month) => {
    setSelectedArchiveMonth(month);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Stats calculation
  const totalReleases = releaseNotes.length;
  const totalFeatures = releaseNotes.reduce(
    (acc, item) => acc + (item.features ? item.features.length : 0),
    0
  );
  const totalBugFixes = releaseNotes.reduce(
    (acc, item) => acc + (item.bugFixes ? item.bugFixes.length : 0),
    0
  );

  return (
    <div className="rn-wrapper">
      {/* Header Banner */}
      <div className="rn-header-banner">
        <div className="rn-header-left">
          <div className="rn-brand-icon">
            <FaBullhorn />
          </div>
          <div>
            <h1 className="rn-header-title">SSES Management System Release Notes</h1>
            <p className="rn-header-sub">
              Stay up to date with the latest features, improvements, and bug fixes across the platform.
            </p>
          </div>
        </div>

        <div className="rn-header-actions">
          <div className="rn-header-badge">
            <FaCheckCircle className="rn-header-badge-icon" />
            {releaseNotes[0]?.version ? `Current: ${releaseNotes[0].version}` : "No Releases Yet"}
          </div>

          {/* Add Release Note button ONLY visible to authorized creators */}
          {isAuthorizedCreator && (
            <button
              type="button"
              className="rn-btn-add-release"
              onClick={handleOpenAddModal}
            >
              <FaPlus /> Add Release Note
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="rn-layout">
        {/* Timeline Feed */}
        <div>
          {(selectedArchiveMonth !== "ALL" || selectedArchiveYear !== "ALL") && (
            <div className="rn-filter-bar">
              <span>
                Showing <strong>{filteredReleaseNotes.length}</strong>{" "}
                {filteredReleaseNotes.length === 1 ? "release" : "releases"} for{" "}
                <strong>
                  {selectedArchiveMonth !== "ALL"
                    ? selectedArchiveMonth
                    : `Year ${selectedArchiveYear}`}
                </strong>
              </span>
              <button
                type="button"
                className="rn-filter-clear-btn"
                onClick={() => {
                  setSelectedArchiveMonth("ALL");
                  setSelectedArchiveYear("ALL");
                  setCurrentPage(1);
                }}
              >
                Show All Releases
              </button>
            </div>
          )}

          {loading ? (
            <div className="rn-empty-state">
              <div className="rn-empty-icon">
                <FaSpinner className="animate-spin" />
              </div>
              <h3 className="rn-empty-title">Loading Release Notes...</h3>
              <p className="rn-empty-sub">Please wait while we fetch the latest updates.</p>
            </div>
          ) : paginatedReleaseNotes.length === 0 ? (
            <div className="rn-empty-state">
              <div className="rn-empty-icon">
                <FaBullhorn />
              </div>
              <h3 className="rn-empty-title">No Release Notes Available</h3>
              <p className="rn-empty-sub">
                {isAuthorizedCreator
                  ? "Start documenting platform updates by adding your first release note."
                  : "Platform updates and release notes will appear here once published."}
              </p>
              {isAuthorizedCreator && (
                <button
                  type="button"
                  className="rn-btn-add-release"
                  onClick={handleOpenAddModal}
                >
                  <FaPlus /> Add Release Note
                </button>
              )}
            </div>
          ) : (
            <div className="rn-timeline">
              {paginatedReleaseNotes.map((release) => (
                <div
                  key={release.id || release.version}
                  id={release.id}
                  className="rn-timeline-entry"
                >
                  <div className="rn-timeline-bullet"></div>

                  <div className="rn-card">
                    {/* Release Card Header */}
                    <div className="rn-card-header">
                      <div>
                        <h2 className="rn-release-title">{release.title}</h2>
                        <div className="rn-release-meta">
                          <span className="inline-flex items-center gap-1.5">
                            <FaCalendarAlt className="rn-meta-icon" /> {release.date}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5">
                            <FaCode className="rn-meta-icon" /> Released by:{" "}
                            <strong>{release.developer || release.author || "Team"}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="rn-card-header-right">
                        <span className="rn-tag">
                          <FaTag /> {release.version}
                        </span>
                        {isAuthorizedCreator && (
                          <button
                            type="button"
                            className="rn-btn-edit-release"
                            onClick={() => handleOpenEditModal(release)}
                            title="Edit release note"
                          >
                            <FaEdit /> Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Key Enhancements */}
                    {release.features && release.features.length > 0 && (
                      <div>
                        <div className="rn-section-heading">
                          <FaStar /> Key Enhancements
                        </div>

                        {release.features.map((feature, fIdx) => (
                          <div key={fIdx} className="rn-feature-item">
                            <h3 className="rn-feature-title">{feature.title}</h3>
                            {feature.description && (
                              <p className="rn-feature-desc">{feature.description}</p>
                            )}

                            {feature.image && (
                              <div className="rn-image-box">
                                <div
                                  className="rn-image-preview-wrapper"
                                  onClick={() =>
                                    setLightbox({
                                      src: feature.image,
                                      title: feature.imageCaption || feature.title,
                                    })
                                  }
                                  title="Click to view full image"
                                >
                                  <img
                                    src={feature.image}
                                    alt={feature.title}
                                    className="rn-feature-img"
                                    loading="lazy"
                                  />
                                  <div className="rn-image-overlay">
                                    <div className="rn-overlay-btn">
                                      <FaSearchPlus /> View Full Screenshot
                                    </div>
                                  </div>
                                </div>

                                <div className="rn-image-bar">
                                  <span className="rn-image-caption">
                                    {feature.imageCaption || feature.title}
                                  </span>
                                  <button
                                    type="button"
                                    className="rn-image-link-btn"
                                    onClick={() =>
                                      setLightbox({
                                        src: feature.image,
                                        title: feature.imageCaption || feature.title,
                                      })
                                    }
                                  >
                                    <FaExternalLinkAlt /> View Full Image
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bug Fixes */}
                    {release.bugFixes && release.bugFixes.length > 0 && (
                      <div>
                        <div className="rn-section-heading">
                          <FaCheckCircle /> Bug Fixes & Improvements
                        </div>
                        <ul className="rn-bugfix-list">
                          {release.bugFixes.map((bug, bIdx) => (
                            <li key={bIdx}>
                              <FaCheck className="rn-bugfix-icon" />
                              <span>{bug}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredReleaseNotes.length > 0 && totalPages > 1 && (
            <div className="rn-pagination-card">
              <Pagination
                totalItems={filteredReleaseNotes.length}
                currentPage={safeCurrentPage}
                pageSize={RELEASES_PER_PAGE}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                label="releases"
              />
            </div>
          )}
        </div>

        {/* Sticky Sidebar */}
        <aside className="rn-sidebar">
          {/* Releases Archive Widget */}
          <div className="rn-widget">
            <div className="rn-widget-header-row">
              <h4 className="rn-widget-title">
                <FaArchive /> Releases Archive
              </h4>
              {archiveYears.length > 1 && (
                <select
                  className="rn-archive-year-select"
                  value={selectedArchiveYear}
                  onChange={(e) => {
                    setSelectedArchiveYear(e.target.value);
                    setSelectedArchiveMonth("ALL");
                    setCurrentPage(1);
                  }}
                  aria-label="Filter archive by year"
                >
                  <option value="ALL">All Years</option>
                  {archiveYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <ul className="rn-archive-list">
              <li className="rn-archive-item">
                <a
                  href="#all-releases"
                  className={`rn-archive-link ${
                    selectedArchiveMonth === "ALL" ? "active" : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedArchiveMonth("ALL");
                    setCurrentPage(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span>
                    {selectedArchiveYear === "ALL"
                      ? "All Releases"
                      : `All ${selectedArchiveYear} Releases`}
                  </span>
                  <span className="rn-archive-count">
                    {archiveGroups.reduce((sum, g) => sum + g.count, 0)}
                  </span>
                </a>
              </li>

              {archiveGroups.map((group) => (
                <li key={group.month} className="rn-archive-item">
                  <a
                    href={`#archive-${group.month.replace(/\s+/g, "-").toLowerCase()}`}
                    className={`rn-archive-link ${
                      selectedArchiveMonth === group.month ? "active" : ""
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectArchiveMonth(group.month);
                    }}
                  >
                    <span>{group.month}</span>
                    <span className="rn-archive-count">{group.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Release Statistics Widget */}
          <div className="rn-widget">
            <h4 className="rn-widget-title">
              <FaChartPie /> Platform Updates
            </h4>
            <div className="rn-stats-list">
              <div className="rn-stat-row">
                <span className="rn-stat-label">Total Releases</span>
                <strong className="rn-stat-value">{totalReleases}</strong>
              </div>
              <div className="rn-stat-row">
                <span className="rn-stat-label">Key Enhancements</span>
                <strong className="rn-stat-value">{totalFeatures}</strong>
              </div>
              <div className="rn-stat-row">
                <span className="rn-stat-label">Bug Fixes Resolved</span>
                <strong className="rn-stat-value">{totalBugFixes}</strong>
              </div>
            </div>
          </div>

          {/* Role & Authorized Info Widget */}
          <div className="rn-widget">
            <h4 className="rn-widget-title">
              <FaShieldAlt /> Release Management
            </h4>
            <p className="rn-access-text">
              Current User: <strong>{loggedInUserName || userRole || "User"}</strong>
              <br />
              {isAuthorizedCreator ? (
                <span className="rn-access-authorized">
                  <FaCheckCircle /> Authorized to publish new releases.
                </span>
              ) : (
                <span>View-only mode. Release publishing is managed by Anees Khan & Himanshu Vishwakarma.</span>
              )}
            </p>
          </div>
        </aside>
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          className="rn-modal-overlay"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="rn-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="rn-modal-close-icon"
              onClick={() => setLightbox(null)}
              aria-label="Close image modal"
            >
              ×
            </button>

            <img
              src={lightbox.src}
              alt={lightbox.title}
              className="rn-modal-img"
            />

            <div className="rn-modal-bar">
              <span className="rn-modal-title">{lightbox.title}</span>
              <a
                href={lightbox.src}
                target="_blank"
                rel="noopener noreferrer"
                className="rn-modal-btn"
              >
                <FaExternalLinkAlt /> Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Release Note Form Modal */}
      {showAddModal && isAuthorizedCreator && (
        <div
          className="rn-form-modal-overlay"
          onClick={handleCloseModal}
        >
          <div
            className="rn-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rn-form-modal-header">
              <h2 className="rn-form-modal-title">
                {editingReleaseId ? <FaEdit /> : <FaPlus />}
                {editingReleaseId ? "Edit Release Note" : "Create New Release Note"}
              </h2>
              <button
                type="button"
                className="rn-form-modal-close"
                onClick={handleCloseModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReleaseNote}>
              <div className="rn-form-modal-body">
                {/* Developer / Released By Input */}
                <div className="rn-form-row">
                  <div className="rn-form-group">
                    <label className="rn-form-label">
                      Released By Developer <span className="rn-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="rn-form-input"
                      placeholder="e.g. Anees Khan, Himanshu Vishwakarma"
                      value={formData.developer}
                      onChange={(e) =>
                        setFormData({ ...formData, developer: e.target.value })
                      }
                      required
                    />
                    <small className="rn-field-hint">
                      Auto-filled with your account name. Add comma-separated names for multiple developers.
                    </small>
                  </div>

                  <div className="rn-form-group">
                    <label className="rn-form-label">Release Date</label>
                    <input
                      type="text"
                      className="rn-form-input"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Version Tag & Auto-synced Title */}
                <div className="rn-form-row">
                  <div className="rn-form-group">
                    <label className="rn-form-label">
                      Version Tag (Auto Calculated) <span className="rn-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="rn-form-input"
                      placeholder="e.g. v3.9"
                      value={formData.version}
                      onChange={(e) => handleVersionChange(e.target.value)}
                      required
                    />
                    <small className="rn-field-hint">
                      Auto-filled based on previous release version.
                    </small>
                  </div>

                  <div className="rn-form-group">
                    <label className="rn-form-label">
                      Release Title (Auto Generated) <span className="rn-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="rn-form-input"
                      placeholder="e.g. Release Notes 3.9"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Archive Month & Year Dropdowns */}
                <div className="rn-form-row">
                  <div className="rn-form-group">
                    <label className="rn-form-label">
                      Archive Month <span className="rn-field-hint" style={{ display: "inline" }}>(Right Sidebar Link)</span>
                    </label>
                    <select
                      className="rn-form-input"
                      value={formData.selectedMonth}
                      onChange={(e) => {
                        const newMonth = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          selectedMonth: newMonth,
                          archiveMonth: `${newMonth} ${prev.selectedYear}`,
                        }));
                      }}
                    >
                      {MONTH_NAMES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rn-form-group">
                    <label className="rn-form-label">Archive Year</label>
                    <select
                      className="rn-form-input"
                      value={formData.selectedYear}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          selectedYear: newYear,
                          archiveMonth: `${prev.selectedMonth} ${newYear}`,
                        }));
                      }}
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Key Enhancements Section */}
                <div className="rn-form-section-title">
                  <span>Key Enhancements</span>
                  <button
                    type="button"
                    className="rn-btn-outline-add"
                    onClick={handleAddFeature}
                  >
                    <FaPlus /> Add Feature
                  </button>
                </div>

                {formData.features.map((feat, fIdx) => (
                  <div key={fIdx} className="rn-feature-card-builder">
                    {formData.features.length > 1 && (
                      <button
                        type="button"
                        className="rn-feature-card-remove"
                        onClick={() => handleRemoveFeature(fIdx)}
                      >
                        <FaTrash /> Remove
                      </button>
                    )}

                    <div className="rn-form-group">
                      <label className="rn-form-label">Feature #{fIdx + 1} Title</label>
                      <input
                        type="text"
                        className="rn-form-input"
                        placeholder="Feature name / enhancement title"
                        value={feat.title}
                        onChange={(e) =>
                          handleFeatureChange(fIdx, "title", e.target.value)
                        }
                      />
                    </div>

                    <div className="rn-form-group">
                      <label className="rn-form-label">Feature Description</label>
                      <textarea
                        rows={2}
                        className="rn-form-textarea"
                        placeholder="Explain what was added or improved..."
                        value={feat.description}
                        onChange={(e) =>
                          handleFeatureChange(fIdx, "description", e.target.value)
                        }
                      />
                    </div>

                    {/* Screenshot Upload with preview */}
                    <div className="rn-form-group">
                      <label className="rn-form-label">
                        Screenshot (Uploads directly to Cloud Storage)
                      </label>

                      {!feat.imagePreview ? (
                        <div
                          className="rn-upload-dropzone"
                          onClick={() =>
                            document.getElementById(`rn-file-input-${fIdx}`)?.click()
                          }
                        >
                          <FaCloudUploadAlt className="rn-upload-icon" />
                          <div className="rn-upload-title">
                            Click to upload screenshot
                          </div>
                          <div className="rn-upload-sub">
                            PNG, JPG, JPEG (compressed and uploaded to Cloudinary Storage)
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            id={`rn-file-input-${fIdx}`}
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageUpload(fIdx, e.target.files[0]);
                                e.target.value = "";
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="rn-preview-img-container">
                            <img
                              src={feat.imagePreview}
                              alt="preview"
                              className="rn-preview-thumb"
                            />
                            <div className="rn-preview-meta">
                              <div className="rn-preview-status">
                                <FaCheckCircle />
                                {feat.imageBase64
                                  ? "New Screenshot Ready for Cloud Upload"
                                  : "Existing Cloud Screenshot"}
                              </div>
                              <input
                                type="text"
                                className="rn-form-input rn-caption-input"
                                placeholder="Image Caption (e.g. Multi-Session Selector Interface)"
                                value={feat.imageCaption}
                                onChange={(e) =>
                                  handleFeatureChange(fIdx, "imageCaption", e.target.value)
                                }
                              />
                            </div>
                            <button
                              type="button"
                              className="rn-feature-card-remove rn-feature-card-remove-inline"
                              onClick={() => handleRemoveImage(fIdx)}
                            >
                              Remove Image
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Bug Fixes Section */}
                <div className="rn-form-section-title">
                  <span>Bug Fixes & Improvements</span>
                  <button
                    type="button"
                    className="rn-btn-outline-add"
                    onClick={handleAddBugFix}
                  >
                    <FaPlus /> Add Fix
                  </button>
                </div>

                {formData.bugFixes.map((bug, bIdx) => (
                  <div key={bIdx} className="rn-bugfix-row">
                    <input
                      type="text"
                      className="rn-form-input"
                      placeholder={`Bug fix / improvement #${bIdx + 1}`}
                      value={bug}
                      onChange={(e) => handleBugFixChange(bIdx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="rn-feature-card-remove rn-feature-card-remove-inline"
                      onClick={() => handleRemoveBugFix(bIdx)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>

              <div className="rn-form-modal-footer">
                <button
                  type="button"
                  className="rn-btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rn-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin" />{" "}
                      {editingReleaseId ? "Updating..." : "Uploading to Cloud..."}
                    </>
                  ) : (
                    <>
                      {editingReleaseId ? <FaSave /> : <FaPaperPlane />}{" "}
                      {editingReleaseId ? "Update Release Note" : "Publish Release Note"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleaseNotes;
