import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Reusable SecurityHelmet component
 * Ensures consistent page title, meta security headers, and SEO properties.
 */
const SecurityHelmet = ({
  title = "SSES Management System",
  description = "Sant Singaji Educational Society - Academic and Placement Management System",
  keywords = "SSES, SSISM, student management, placement portal, college management",
  children
}) => {
  const fullTitle = title.includes("SSES") ? title : `${title} | SSES Management System`;

  return (
    <Helmet>
      {/* Title */}
      <title>{fullTitle}</title>

      {/* Primary Meta Tags */}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Security Meta Tags */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta name="referrer" content="strict-origin-when-cross-origin" />

      {/* Custom Children */}
      {children}
    </Helmet>
  );
};

export default SecurityHelmet;
