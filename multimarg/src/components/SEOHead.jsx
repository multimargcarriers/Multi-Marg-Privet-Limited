import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://www.multimarg.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/mc.png`;
const SITE_NAME = 'Multimarg Carriers Pvt. Ltd.';

/**
 * SEOHead — Reusable per-page SEO component
 * Injects <title>, meta description, keywords, Open Graph, Twitter Card,
 * canonical URL, and optional JSON-LD structured data into the <head>.
 *
 * @param {string} title — Page title (appended with site name)
 * @param {string} description — Meta description (max ~160 chars recommended)
 * @param {string} keywords — Comma-separated keywords
 * @param {string} canonicalPath — Path portion, e.g. "/about" (defaults to "/")
 * @param {string} ogImage — Full URL to OG image (defaults to logo)
 * @param {string} ogType — Open Graph type (defaults to "website")
 * @param {object|array} jsonLd — JSON-LD structured data object(s)
 */
const SEOHead = ({
  title,
  description,
  keywords = '',
  canonicalPath = '/',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  jsonLd = null,
}) => {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — India's Trusted Logistics & Transport Company`;

  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  // Common misspelling keywords appended to every page
  const baseKeywords = 'multimarg, multimarg carriers, multi marg, multimark carriers, multimarg transport, multimarg logistics, multimarg pvt ltd, multimarg rudrapur, logistics company india, transport services india';
  const allKeywords = keywords ? `${keywords}, ${baseKeywords}` : baseKeywords;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />

      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title || fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={`${title || SITE_NAME}`} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? { "@context": "https://schema.org", "@graph": jsonLd } : jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
