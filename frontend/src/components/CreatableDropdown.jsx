import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Plus, X, Clock, Zap } from "lucide-react";
import { recordSuggestion, getSuggestions, resolveCategory } from "../utils/smartSuggestions";

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

  const catKey = resolveCategory(category || name || "city");

  // Get local frequent & recent memory suggestions strictly for this category
  const smartList = getSuggestions(catKey, query, 12);

  // Filter DB options
  const filteredOptions = (options || []).filter((opt) => {
    if (query === value && value !== "") return true;
    const q = (query || "").toLowerCase();
    const nameStr = opt.client || opt.name || opt.city || opt.vendorName || "";
    return nameStr.toLowerCase().includes(q);
  });

  const exactMatch = (options || []).some((opt) => {
    const nameStr = opt.client || opt.name || opt.city || opt.vendorName || "";
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

  // Combine and sort options: Recent first -> Frequent next -> Others
  const dbOptionsMap = new Map();
  filteredOptions.forEach((opt) => {
    const nameStr = (opt.client || opt.name || opt.city || opt.vendorName || "").toUpperCase();
    if (nameStr) dbOptionsMap.set(nameStr, opt);
  });

  const combinedItems = [];
  const addedNames = new Set();

  // 1. Add Recent items first
  smartList.filter(s => s.type === 'recent').forEach((item) => {
    const key = item.text.toUpperCase();
    if (!addedNames.has(key)) {
      addedNames.add(key);
      combinedItems.push({
        text: item.text,
        type: 'recent',
        rawOption: dbOptionsMap.get(key) || null
      });
    }
  });

  // 2. Add Frequent items second
  smartList.filter(s => s.type === 'frequent').forEach((item) => {
    const key = item.text.toUpperCase();
    if (!addedNames.has(key)) {
      addedNames.add(key);
      combinedItems.push({
        text: item.text,
        type: 'frequent',
        rawOption: dbOptionsMap.get(key) || null
      });
    }
  });

  // 3. Add remaining DB options
  dbOptionsMap.forEach((opt, key) => {
    if (!addedNames.has(key)) {
      addedNames.add(key);
      combinedItems.push({
        text: opt.client || opt.name || opt.city || opt.vendorName || key,
        type: 'normal',
        rawOption: opt
      });
    }
  });

  // 4. Add remaining smart items
  smartList.forEach((item) => {
    const key = item.text.toUpperCase();
    if (!addedNames.has(key)) {
      addedNames.add(key);
      combinedItems.push({
        text: item.text,
        type: 'normal',
        rawOption: null
      });
    }
  });

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
          {combinedItems.length > 0 ? (
            combinedItems.map((item, idx) => (
              <div 
                key={`item-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item.text, item.rawOption);
                }}
                style={{ 
                  padding: "0.55rem 0.75rem", 
                  cursor: "pointer",
                  borderRadius: "6px",
                  transition: "background 0.15s",
                  color: "var(--text-color, #1e293b)",
                  fontWeight: item.type === 'recent' || item.type === 'frequent' ? 600 : 500,
                  fontSize: "0.85rem",
                  textTransform: "uppercase",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = item.type === 'recent' ? "#ede9fe" : (item.type === 'frequent' ? "#fef3c7" : "#eff6ff")}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.type === 'recent' ? (
                    <Clock size={12} color="#8b5cf6" />
                  ) : item.type === 'frequent' ? (
                    <Zap size={12} color="#f59e0b" />
                  ) : null}
                  <span>{item.text}</span>
                </div>
                {item.type === 'recent' ? (
                  <span style={{ fontSize: "0.62rem", color: "#6d28d9", background: "#ede9fe", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                    Recent
                  </span>
                ) : item.type === 'frequent' ? (
                  <span style={{ fontSize: "0.62rem", color: "#b45309", background: "#fef3c7", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                    Frequent
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <div style={{ padding: "0.75rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              No matches found
            </div>
          )}

          {onCreate && query && !exactMatch && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                recordSuggestion(catKey, query);
                onCreate(query);
                setIsOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.6rem 0.75rem",
                cursor: "pointer",
                borderTop: "1px solid #f1f5f9",
                color: "var(--primary-color)",
                fontWeight: 600,
                fontSize: "0.85rem",
                marginTop: "4px",
                borderRadius: "6px"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light, #eff6ff)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Plus size={16} />
              <span>Create "{query.toUpperCase()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableDropdown;
