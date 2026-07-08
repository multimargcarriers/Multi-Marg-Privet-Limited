import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, MapPin, X } from "lucide-react";

/**
 * A custom searchable select dropdown designed specifically for Cities/States.
 * @param {Array} options - Array of city objects { id, city, state, stateCode, short }
 * @param {string} value - The currently selected city name
 * @param {function} onChange - Callback (selectedCityName, selectedCityObject)
 * @param {string} placeholder - Input placeholder
 */
const SearchableSelect = ({ options, value, onChange, placeholder = "Search...", displayKey = "city" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside and reset query if no valid selection was made
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery(value || ""); // Reset query to last selected value when clicking away
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Update local query when value prop changes (e.g., reset form)
  useEffect(() => {
    if (value) {
      setQuery(value);
    } else {
      setQuery("");
    }
  }, [value]);

  const filteredOptions = options.filter((opt) => {
    // If the search query exactly matches the currently selected value, 
    // it means the user just opened the dropdown to browse. Show all options.
    if (query === value && value !== "") return true;

    const q = query.toLowerCase();
    
    // Search across all properties dynamically
    return Object.values(opt).some(val => 
      val && val.toString().toLowerCase().includes(q)
    );
  });

  const handleSelect = (opt) => {
    const displayValue = typeof opt === 'object' ? opt[displayKey] : opt;
    setQuery(displayValue);
    onChange(displayValue, opt);
    setIsOpen(false);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
    // If they clear the text, clear the value in the parent
    if (e.target.value === "") {
      onChange("", null);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div 
        style={{ 
          position: "relative", 
          display: "flex", 
          alignItems: "center" 
        }}
      >
        <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 12 }} />
        <input
          type="text"
          className="form-control"
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
            background: "#fff"
          }}
        />
        
        {/* Clear Button */}
        {value && (
          <X 
            size={16} 
            color="var(--text-muted)" 
            style={{ 
              position: "absolute", 
              right: 36, 
              cursor: "pointer",
            }} 
            onClick={(e) => {
              e.stopPropagation();
              onChange("", null);
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
            maxHeight: "250px", 
            overflowY: "auto", 
            zIndex: 100,
            padding: "0.5rem",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
          }}
        >
          {filteredOptions.length === 0 ? (
            <div style={{ padding: "0.75rem", color: "var(--text-muted)", textAlign: "center", fontSize: "0.9rem" }}>
              No cities found matching "{query}"
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <div 
                key={opt.id}
                onClick={() => handleSelect(opt)}
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem", 
                  cursor: "pointer",
                  borderRadius: "6px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(13, 110, 253, 0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={16} color="var(--primary-color)" />
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-color)" }}>{typeof opt === 'object' ? opt[displayKey] : opt}</div>
                    {opt.state && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {opt.state} {opt.stateCode ? `(GST: ${opt.stateCode})` : ""}
                      </div>
                    )}
                  </div>
                </div>
                {opt.short && (
                  <span style={{ 
                    fontSize: "0.8rem", 
                    padding: "2px 6px", 
                    background: "rgba(13, 110, 253, 0.1)", 
                    color: "var(--primary-color)", 
                    borderRadius: "4px",
                    fontWeight: 600
                  }}>
                    {opt.short}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
