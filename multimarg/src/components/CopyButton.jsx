import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const CopyButton = ({
  text,
  title = "Copy AWB",
  size = 14,
  className = "",
  style = {}
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
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: copied ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.15)",
        border: copied ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(203, 213, 225, 0.8)",
        borderRadius: "6px",
        padding: "3px 6px",
        cursor: "pointer",
        color: copied ? "#10b981" : "#475569",
        transition: "all 0.15s ease",
        verticalAlign: "middle",
        lineHeight: 1,
        marginLeft: "6px",
        flexShrink: 0,
        ...style
      }}
    >
      {copied ? <Check size={size} color="#10b981" /> : <Copy size={size} />}
    </button>
  );
};

export default CopyButton;
