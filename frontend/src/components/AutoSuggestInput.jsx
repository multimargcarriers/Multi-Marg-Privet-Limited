import React, { useState, useEffect, useRef } from "react";
import { Clock, Zap, MapPin, Building, Truck, Package } from "lucide-react";
import { recordSuggestion, getSuggestions, resolveCategory } from "../utils/smartSuggestions";

/**
 * AutoSuggestInput
 * Responsive text input with strictly categorized suggestions.
 * Prioritizes Recent items first, followed by Most Frequently Used items.
 */
const AutoSuggestInput = ({
  category = "general",
  value = "",
  onChange,
  onBlur,
  placeholder = "",
  format = (v) => v,
  className = "form-control",
  style = {},
  required = false,
  id,
  name,
  disabled = false,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const resolvedCat = resolveCategory(category);

  // Update suggestions when value or category changes
  useEffect(() => {
    const list = getSuggestions(category, value, 8);
    setSuggestions(list);
  }, [category, value]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    const formatted = format ? format(rawVal) : rawVal;
    if (onChange) onChange({ ...e, target: { ...e.target, value: formatted, name } });
    setIsOpen(true);
  };

  const handleSelectSuggestion = (suggestedText) => {
    const formatted = format ? format(suggestedText) : suggestedText;
    recordSuggestion(category, formatted);
    if (onChange) {
      onChange({ target: { value: formatted, name } });
    }
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputBlur = (e) => {
    if (value && value.trim()) {
      recordSuggestion(category, value);
    }
    if (onBlur) onBlur(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && value && value.trim()) {
      recordSuggestion(category, value);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const getCategoryTitle = () => {
    switch (resolvedCat) {
      case "city": return "Suggested Cities";
      case "client": return "Suggested Clients";
      case "vendor": return "Suggested Vendors";
      case "vehicle": return "Suggested Vehicles";
      case "particular": return "Suggested Particulars";
      default: return "Suggestions";
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        className={className}
        style={{ ...style }}
        placeholder={placeholder}
        value={value || ""}
        onChange={handleInputChange}
        onFocus={() => {
          setSuggestions(getSuggestions(category, value, 8));
          setIsOpen(true);
        }}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        required={required}
        disabled={disabled}
        autoComplete="off"
        spellCheck="false"
        {...rest}
      />

      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            maxHeight: "220px",
            overflowY: "auto",
            zIndex: 1050,
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
            padding: "4px"
          }}
        >
          <div style={{ padding: "4px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", marginBottom: "2px" }}>
            <span>{getCategoryTitle()}</span>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8" }}>Recent First</span>
          </div>

          {suggestions.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(item.text);
              }}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#1e293b",
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.type === 'recent' ? (
                  <Clock size={12} color="#8b5cf6" />
                ) : item.type === 'frequent' ? (
                  <Zap size={12} color="#f59e0b" />
                ) : (
                  <span style={{ width: "12px", height: "12px", display: "inline-block" }}>•</span>
                )}
                <span>{item.text}</span>
              </div>
              {item.type === 'recent' ? (
                <span style={{ fontSize: "0.62rem", color: "#6d28d9", background: "#ede9fe", padding: "1px 6px", borderRadius: "10px", fontWeight: 700, flexShrink: 0 }}>
                  Recent
                </span>
              ) : item.type === 'frequent' ? (
                <span style={{ fontSize: "0.62rem", color: "#b45309", background: "#fef3c7", padding: "1px 6px", borderRadius: "10px", fontWeight: 700, flexShrink: 0 }}>
                  Frequent
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutoSuggestInput;
