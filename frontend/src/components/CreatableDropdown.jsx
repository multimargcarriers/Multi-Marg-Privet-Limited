import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Plus, X, Clock, Zap } from "lucide-react";
import { recordSuggestion, getSuggestions } from "../utils/smartSuggestions";

const CreatableDropdown = ({
  options = [],
  value,
  onChange,
  onCreate,
  placeholder = "Select or type to create...",
  _format,
  id,
  name,
  category = "city"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery(value || ""); 
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  useEffect(() => {
    if (value) {
      setQuery(value);
    } else {
      setQuery("");
    }
  }, [value]);

  const catKey = category || name || "city";

  // Filter DB options
  const filteredOptions = (options || []).filter((opt) => {
    if (query === value && value !== "") return true;
    const q = (query || "").toLowerCase();
    const nameStr = opt.client || opt.name || opt.city || "";
    return nameStr.toLowerCase().includes(q);
  });

  // Get local frequent & recent memory suggestions
  const smartList = getSuggestions(catKey, query, 8);

  const exactMatch = (options || []).some((opt) => {
    const nameStr = opt.client || opt.name || opt.city || "";
    return nameStr.toLowerCase() === (query || "").trim().toLowerCase();
  });

  const handleSelect = (selectedValue, selectedOption) => {
    const val = (selectedValue || "").toLowerCase();
    recordSuggestion(catKey, val);
    setQuery(val);
    onChange(val, selectedOption);
    setIsOpen(false);
  };

  const handleChange = (e) => {
    let val = e.target.value.toLowerCase();
    setQuery(val);
    setIsOpen(true);
    if (val === "") {
      onChange("");
    }
  };

  // Find smart items not already in filtered DB options
  const dbOptionNames = new Set(
    filteredOptions.map((opt) => (opt.client || opt.name || opt.city || "").toUpperCase())
  );
  const additionalSmartSuggestions = smartList.filter(
    (item) => !dbOptionNames.has(item.text.toUpperCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 12 }} />
        <input
          id={id || name || `creatable-input-${Math.random().toString(36).substring(7)}`}
          name={name || `creatable-${Math.random().toString(36).substring(7)}`}
          type="text"
          className="form-control"
          autoComplete="off"
          spellCheck="false"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onFocus={(e) => { 
            setIsOpen(true); 
            e.target.select(); 
          }}
          style={{ 
            paddingLeft: 36, 
            paddingRight: value ? 64 : 36, 
            cursor: "text",
            background: "#fff",
            textTransform: "uppercase"
          }}
        />
        
        {value && (
          <X 
            size={16} 
            color="var(--text-muted)" 
            style={{ position: "absolute", right: 36, cursor: "pointer" }} 
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setQuery("");
              setIsOpen(true);
            }}
          />
        )}
        
        <div style={{ position: "absolute", right: 12, height: "100%", display: "flex", alignItems: "center", pointerEvents: "none" }}>
          <ChevronDown 
            size={16} 
            color="var(--text-muted)" 
            style={{ 
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }} 
          />
        </div>
      </div>

      {isOpen && (
        <div 
          className="glass-panel"
          style={{ 
            position: "absolute", 
            top: "100%", 
            left: 0, 
            right: 0, 
            marginTop: "4px", 
            maxHeight: "260px", 
            overflowY: "auto", 
            zIndex: 1050,
            padding: "0.4rem",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
          }}
        >
          {/* 1. Database Options */}
          {filteredOptions.length > 0 && filteredOptions.map((opt, idx) => {
            const nameStr = opt.client || opt.name || opt.city || "";
            const isFrequent = smartList.some(s => s.text.toUpperCase() === nameStr.toUpperCase());
            return (
              <div 
                key={opt.id || `opt-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(nameStr, opt);
                }}
                style={{ 
                  padding: "0.55rem 0.75rem", 
                  cursor: "pointer",
                  borderRadius: "6px",
                  transition: "background 0.15s",
                  color: "var(--text-color, #1e293b)",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span>{nameStr}</span>
                {isFrequent && (
                  <span style={{ fontSize: "0.65rem", color: "#2563eb", background: "#dbeafe", padding: "1px 6px", borderRadius: "10px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                    <Zap size={10} /> Frequent
                  </span>
                )}
              </div>
            );
          })}

          {/* 2. Additional Local Storage / IndexedDB Frequent Words */}
          {additionalSmartSuggestions.length > 0 && (
            <>
              <div style={{ padding: "6px 8px 2px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", borderTop: filteredOptions.length > 0 ? "1px solid #f1f5f9" : "none", marginTop: filteredOptions.length > 0 ? "4px" : "0", display: "flex", justifyContent: "space-between" }}>
                <span>Frequent / Recent</span>
                <span style={{ fontSize: "0.62rem", color: "#94a3b8" }}>Local Memory</span>
              </div>
              {additionalSmartSuggestions.map((item, sIdx) => (
                <div
                  key={`smart-${sIdx}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item.text);
                  }}
                  style={{
                    padding: "0.55rem 0.75rem",
                    cursor: "pointer",
                    borderRadius: "6px",
                    transition: "background 0.15s",
                    color: "#0f172a",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fef3c7"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {item.isRecent ? <Clock size={12} color="#3b82f6" /> : <Zap size={12} color="#d97706" />}
                    {item.text}
                  </span>
                  {item.frequency > 1 && (
                    <span style={{ fontSize: "0.68rem", color: "#92400e", background: "#fde68a", padding: "1px 6px", borderRadius: "10px", fontWeight: 600 }}>
                      {item.frequency}x
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* 3. Add Custom Item */}
          {!exactMatch && query.trim() !== "" && query !== value && navigator.onLine && (
            <div 
              onMouseDown={(e) => {
                e.preventDefault();
                recordSuggestion(catKey, query.trim());
                if (onCreate) {
                  onCreate(query.trim().toLowerCase());
                  setIsOpen(false);
                } else {
                  handleSelect(query.trim().toLowerCase());
                }
              }}
              style={{ 
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.6rem 0.75rem", 
                cursor: "pointer",
                borderRadius: "6px",
                transition: "background 0.15s",
                color: "#2563eb",
                fontWeight: 600,
                fontSize: "0.85rem",
                borderTop: (filteredOptions.length > 0 || additionalSmartSuggestions.length > 0) ? "1px solid #f1f5f9" : "none",
                marginTop: "4px",
                textTransform: "uppercase"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Plus size={15} /> Add "{query.trim()}"
            </div>
          )}

          {filteredOptions.length === 0 && additionalSmartSuggestions.length === 0 && (exactMatch || query.trim() === "") && (
             <div style={{ padding: "0.75rem", color: "var(--text-muted, #94a3b8)", textAlign: "center", fontSize: "0.85rem" }}>
               No options found. Type to add.
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableDropdown;
