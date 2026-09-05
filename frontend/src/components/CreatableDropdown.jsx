import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, Plus, X, Clock, Zap } from "lucide-react";
import { recordSuggestion, getSuggestions, resolveCategory, isClientName } from "../utils/smartSuggestions";

const getOptPrimaryText = (opt) => {
  if (!opt) return "";
  if (typeof opt === "string") return opt.trim();
  return (opt.client || opt.name || opt.city || opt.vendorName || opt.cityName || opt.label || "").trim();
};

const getOptSubText = (opt) => {
  if (!opt || typeof opt === "string") return "";
  if (opt.gst || opt.gstin) return `GST: ${opt.gst || opt.gstin}`;
  if (opt.state) return opt.state;
  if (opt.city && opt.name && opt.city !== opt.name) return opt.city;
  return "";
};

const matchesOption = (opt, qLower) => {
  if (!qLower) return true;
  if (!opt) return false;
  if (typeof opt === "string") return opt.toLowerCase().includes(qLower);
  
  const name = (opt.client || opt.name || opt.city || opt.vendorName || opt.cityName || opt.label || "").toLowerCase();
  const gst = (opt.gst || opt.gstin || "").toLowerCase();
  const city = (opt.city || "").toLowerCase();
  const state = (opt.state || "").toLowerCase();
  const code = (opt.stateCode || opt.code || "").toLowerCase();

  return name.includes(qLower) || gst.includes(qLower) || city.includes(qLower) || state.includes(qLower) || code.includes(qLower);
};

const CreatableDropdown = ({
  options = [],
  value,
  onChange,
  onCreate,
  placeholder = "Select or type to search...",
  id,
  name,
  category,
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync internal query when external value prop changes
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Determine category intelligently
  const catKey = useMemo(() => {
    if (category && category !== "general") return resolveCategory(category);
    const hint = String(name || id || placeholder || "").toLowerCase();
    if (hint.includes("client") || hint.includes("consign") || hint.includes("billed") || hint.includes("party")) return "client";
    if (hint.includes("vendor") || hint.includes("transporter") || hint.includes("handover")) return "vendor";
    if (hint.includes("city") || hint.includes("origin") || hint.includes("dest") || hint.includes("station") || hint.includes("from") || hint.includes("to")) return "city";
    if (hint.includes("vehicle") || hint.includes("truck")) return "vehicle";
    
    if (Array.isArray(options) && options.length > 0) {
      const first = options[0];
      if (first && typeof first === "object") {
        if (first.client || (first.gst && first.name)) return "client";
        if (first.vendorName || first.transporter) return "vendor";
        if (first.city || first.cityName || first.stateCode) return "city";
      }
    }
    return "general";
  }, [category, name, id, placeholder, options]);

  const cleanQuery = (query || "").trim();
  const qLower = cleanQuery.toLowerCase();

  // 1. Fetch smart suggestions from recent & frequent local memory
  const smartList = useMemo(() => {
    return getSuggestions(catKey, cleanQuery, 50);
  }, [catKey, cleanQuery]);

  // 2. Combine and unify ALL DB Options + Suggestions with intelligent relevance ranking
  const combinedItems = useMemo(() => {
    const itemsMap = new Map();

    // Index DB options by uppercase name
    const dbMap = new Map();
    (options || []).forEach(opt => {
      const text = getOptPrimaryText(opt);
      if (text) {
        const key = text.toUpperCase();
        if (!dbMap.has(key)) {
          dbMap.set(key, opt);
        }
      }
    });

    // Helper to safely add/merge an entry
    const addEntry = (text, type, rawOpt = null, subText = "") => {
      if (!text) return;
      const key = String(text).trim().toUpperCase();
      if (!key) return;

      // STRICT CATEGORY ISOLATION: Never show client/company names in a city/origin/destination dropdown
      if (catKey === 'city' && isClientName(key)) {
        return;
      }

      const existing = itemsMap.get(key);
      const finalRaw = rawOpt || existing?.rawOption || dbMap.get(key) || null;
      const finalSub = subText || existing?.subText || getOptSubText(finalRaw);
      
      // Preserve prioritized type: recent > frequent > normal
      let finalType = type;
      if (existing) {
        if (existing.type === 'recent') finalType = 'recent';
        else if (existing.type === 'frequent' && type !== 'recent') finalType = 'frequent';
      }

      itemsMap.set(key, {
        text: key,
        type: finalType,
        rawOption: finalRaw,
        subText: finalSub
      });
    };

    // A. Add Smart Suggestions (Recent & Frequent memory)
    smartList.forEach(s => {
      const text = s.text;
      if (text) {
        const key = text.toUpperCase();
        if (!qLower || key.toLowerCase().includes(qLower)) {
          addEntry(key, s.type || 'normal', dbMap.get(key));
        }
      }
    });

    // B. Add ALL DB options matching search query (matches name, gst, city, state)
    (options || []).forEach(opt => {
      if (matchesOption(opt, qLower)) {
        const text = getOptPrimaryText(opt);
        if (text) {
          addEntry(text, 'normal', opt, getOptSubText(opt));
        }
      }
    });

    const items = Array.from(itemsMap.values());

    // C. Relevance sorting when search query is active
    if (qLower) {
      items.sort((a, b) => {
        const aText = a.text.toLowerCase();
        const bText = b.text.toLowerCase();
        
        // Exact match comes first
        if (aText === qLower && bText !== qLower) return -1;
        if (bText === qLower && aText !== qLower) return 1;

        // Prefix match comes next
        const aStarts = aText.startsWith(qLower);
        const bStarts = bText.startsWith(qLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Suggestions (recent/frequent) prioritized over plain list
        const aScore = a.type === 'recent' ? 2 : a.type === 'frequent' ? 1 : 0;
        const bScore = b.type === 'recent' ? 2 : b.type === 'frequent' ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;

        return aText.localeCompare(bText);
      });
    } else {
      // Default view when unopened/empty: Recent first, Frequent second, DB alphabetical next
      items.sort((a, b) => {
        const aScore = a.type === 'recent' ? 2 : a.type === 'frequent' ? 1 : 0;
        const bScore = b.type === 'recent' ? 2 : b.type === 'frequent' ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return a.text.localeCompare(b.text);
      });
    }

    return items;
  }, [options, smartList, qLower]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [combinedItems]);

  const exactMatch = useMemo(() => {
    if (!cleanQuery) return false;
    return (
      combinedItems.some(item => item.text.toLowerCase() === qLower) ||
      (options || []).some(opt => getOptPrimaryText(opt).toLowerCase() === qLower)
    );
  }, [cleanQuery, qLower, combinedItems, options]);

  const handleSelect = (selectedValue, selectedOption) => {
    const val = selectedValue || "";
    recordSuggestion(catKey, val);
    setQuery(val);
    if (onChange) onChange(val, selectedOption);
    setIsOpen(false);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (onChange) onChange(val);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1 < combinedItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : combinedItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < combinedItems.length) {
        const selected = combinedItems[highlightedIndex];
        handleSelect(selected.text, selected.rawOption);
      } else if (onCreate && cleanQuery && !exactMatch) {
        recordSuggestion(catKey, cleanQuery);
        onCreate(cleanQuery);
        setIsOpen(false);
      } else if (combinedItems.length > 0) {
        handleSelect(combinedItems[0].text, combinedItems[0].rawOption);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Search size={16} color="#94a3b8" style={{ position: "absolute", left: 12, pointerEvents: "none" }} />
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
          onKeyDown={handleKeyDown}
          onFocus={(e) => { 
            setIsOpen(true); 
            e.target.select(); 
          }}
          style={{ 
            paddingLeft: 36, 
            paddingRight: value ? 64 : 36, 
            cursor: "text",
            background: "#fff",
            textTransform: "uppercase",
            fontWeight: 600,
            ...style
          }}
        />
        
        {value && (
          <X 
            size={16} 
            color="#94a3b8" 
            style={{ position: "absolute", right: 36, cursor: "pointer", zIndex: 2 }} 
            onClick={(e) => {
              e.stopPropagation();
              if (onChange) onChange("");
              setQuery("");
              setIsOpen(true);
            }}
          />
        )}
        
        <div 
          onClick={() => setIsOpen(prev => !prev)}
          style={{ position: "absolute", right: 12, height: "100%", display: "flex", alignItems: "center", cursor: "pointer", zIndex: 2 }}
        >
          <ChevronDown 
            size={16} 
            color="#94a3b8" 
            style={{ 
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }} 
          />
        </div>
      </div>

      {isOpen && (
        <div 
          ref={listRef}
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
            combinedItems.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
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
                    color: isHighlighted ? "#1d4ed8" : "#1e293b",
                    background: isHighlighted 
                      ? "#dbeafe" 
                      : (item.type === 'recent' ? "#f5f3ff" : (item.type === 'frequent' ? "#fffbeb" : "transparent")),
                    fontWeight: item.type === 'recent' || item.type === 'frequent' ? 700 : 600,
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => {
                    setHighlightedIndex(idx);
                    e.currentTarget.style.background = item.type === 'recent' ? "#ede9fe" : (item.type === 'frequent' ? "#fef3c7" : "#eff6ff");
                  }}
                  onMouseLeave={(e) => {
                    if (!isHighlighted) {
                      e.currentTarget.style.background = item.type === 'recent' ? "#f5f3ff" : (item.type === 'frequent' ? "#fffbeb" : "transparent");
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.type === 'recent' ? (
                      <Clock size={12} color="#8b5cf6" />
                    ) : item.type === 'frequent' ? (
                      <Zap size={12} color="#f59e0b" />
                    ) : null}
                    <span>{item.text}</span>
                    {item.subText && (
                      <span style={{ fontSize: "0.72rem", color: "#64748b", marginLeft: "6px", fontWeight: 500, textTransform: "none" }}>
                        ({item.subText})
                      </span>
                    )}
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
              );
            })
          ) : (
            <div style={{ padding: "0.75rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", fontWeight: 500 }}>
              No matches found for "{cleanQuery.toUpperCase()}"
            </div>
          )}

          {onCreate && cleanQuery && !exactMatch && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                recordSuggestion(catKey, cleanQuery);
                onCreate(cleanQuery);
                setIsOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.6rem 0.75rem",
                cursor: "pointer",
                borderTop: "1px solid #f1f5f9",
                color: "#2563eb",
                fontWeight: 700,
                fontSize: "0.85rem",
                marginTop: "4px",
                borderRadius: "6px"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Plus size={16} />
              <span>Create "{cleanQuery.toUpperCase()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableDropdown;
