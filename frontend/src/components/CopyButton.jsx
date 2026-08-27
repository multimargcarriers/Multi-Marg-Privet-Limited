import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Universal copy button for AWB / LR numbers.
 * Displays a copy icon that toggles to a green checkmark upon copying.
 */
export const CopyButton = ({
  text,
  title = "Copy AWB",
  size = 13,
  className = "",
  style = {},
  iconStyle = {},
  showLabel = false
}) => {
  const [copied, setCopied] = useState(false);

  if (!text || String(text).trim() === "" || String(text).trim() === "-") {
    return null;
  }

  const handleCopy = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const str = String(text).trim();
    if (!str) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str);
    } else {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = str;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : title}
      aria-label={title}
      className={`copy-awb-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        background: copied ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.15)",
        border: copied ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(203, 213, 225, 0.8)",
        borderRadius: "4px",
        padding: "2px 4px",
        cursor: "pointer",
        color: copied ? "#10b981" : "#475569",
        transition: "all 0.15s ease",
        verticalAlign: "middle",
        lineHeight: 1,
        marginLeft: "4px",
        flexShrink: 0,
        ...style
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
          e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
          e.currentTarget.style.color = "#2563eb";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "rgba(148, 163, 184, 0.15)";
          e.currentTarget.style.borderColor = "rgba(203, 213, 225, 0.8)";
          e.currentTarget.style.color = "#475569";
        }
      }}
    >
      {copied ? (
        <Check size={size} color="#10b981" style={iconStyle} />
      ) : (
        <Copy size={size} style={iconStyle} />
      )}
      {showLabel && (
        <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>
          {copied ? "Copied" : "Copy"}
        </span>
      )}
    </button>
  );
};

/**
 * Universal AWB Display with integrated copy button.
 */
export const AwbBadge = ({
  awb,
  prefix = "",
  size = 13,
  badgeStyle = {},
  textStyle = {},
  showPrefix = true
}) => {
  if (!awb || String(awb).trim() === "" || String(awb).trim() === "-") {
    return <span>-</span>;
  }

  const cleanAwb = String(awb).trim();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        fontVariantNumeric: "tabular-nums",
        ...badgeStyle
      }}
    >
      {showPrefix && prefix && <span style={{ opacity: 0.75 }}>{prefix}</span>}
      <span style={{ fontWeight: 600, ...textStyle }}>{cleanAwb}</span>
      <CopyButton text={cleanAwb} size={size} />
    </span>
  );
};

export default CopyButton;
