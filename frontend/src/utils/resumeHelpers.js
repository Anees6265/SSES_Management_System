import { toast } from "react-toastify";

/**
 * Format student name into a clean, safe filename prefix.
 * e.g. "Himanshu Verma" -> "Himanshu_Verma_Resume.pdf"
 */
export const formatResumeFileName = (studentName) => {
  const clean = (studentName || "Student")
    .trim()
    .replace(/[^a-zA-Z0-9_\s-]/g, "")
    .replace(/\s+/g, "_");
  return `${clean || "Student"}_Resume.pdf`;
};

/**
 * Open resume directly in a new tab for inline viewing.
 * Prevents forced download headers by fetching as a blob and rendering in browser's native PDF viewer,
 * with fallbacks for Cloudinary inline flags and Google Docs PDF viewer.
 */
export const viewResume = async (resumeUrl, studentName = "Student") => {
  if (!resumeUrl) {
    toast.error("Resume URL not found");
    return;
  }

  const cleanName = (studentName || "Student").trim();
  const pageTitle = `${cleanName} - Resume`;

  // Pre-open new tab to bypass browser popup blockers
  const newTab = window.open("about:blank", "_blank");
  if (newTab) {
    try {
      newTab.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${pageTitle}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #0f172a;
                color: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .loader-box {
                text-align: center;
                padding: 24px;
              }
              .spinner {
                width: 42px;
                height: 42px;
                border: 3.5px solid rgba(255,255,255,0.15);
                border-top-color: #f97316;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 16px;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              p { margin: 0; font-size: 14px; font-weight: 600; color: #cbd5e1; }
            </style>
          </head>
          <body>
            <div class="loader-box">
              <div class="spinner"></div>
              <p>Opening ${cleanName}'s Resume...</p>
            </div>
          </body>
        </html>
      `);
    } catch {
      // Ignore if document.write is restricted
    }
  }

  try {
    const response = await fetch(resumeUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    const pdfBlob = new Blob([blob], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(pdfBlob);

    if (newTab && !newTab.closed) {
      newTab.location.href = blobUrl;
    } else {
      window.open(blobUrl, "_blank");
    }

    // Clean up memory after PDF viewer loads
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 120000);
  } catch (error) {
    console.warn("Direct blob resume view failed, using fallback:", error);

    let fallbackUrl = resumeUrl;
    if (fallbackUrl.includes("/upload/") && !fallbackUrl.includes("/fl_inline/")) {
      fallbackUrl = fallbackUrl.replace("/upload/", "/upload/fl_inline/");
    }

    // For Cloudinary raw upload URLs that force download via Content-Disposition: attachment,
    // Google Docs PDF Viewer renders them inline in the tab without downloading
    if (fallbackUrl.includes("/raw/upload/")) {
      fallbackUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fallbackUrl)}&embedded=false`;
    }

    if (newTab && !newTab.closed) {
      newTab.location.href = fallbackUrl;
    } else {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  }
};

/**
 * Download resume with student's name: `${studentName}_Resume.pdf`
 * Uses blob download so browser respects the custom filename.
 */
export const downloadResume = async (resumeUrl, studentName = "Student") => {
  if (!resumeUrl) {
    toast.error("Resume URL not found");
    return;
  }

  const fileName = formatResumeFileName(studentName);
  const toastId = toast.loading(`Downloading ${fileName}...`);

  try {
    const response = await fetch(resumeUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    const pdfBlob = new Blob([blob], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(pdfBlob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    toast.dismiss(toastId);
    toast.success("Resume downloaded successfully");
  } catch (error) {
    console.warn("Resume blob download failed, falling back to link:", error);
    toast.dismiss(toastId);

    const link = document.createElement("a");
    link.href = resumeUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
