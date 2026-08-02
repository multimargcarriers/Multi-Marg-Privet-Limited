import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Plus, X } from "lucide-react";

const CreatableDropdown = ({ options, value, onChange, onCreate, placeholder = "Select or type to create...", format }) => {
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

  const filteredOptions = options.filter((opt) => {
    if (query === value && value !== "") return true;
    const q = query.toLowerCase();
    const name = opt.client || opt.name || opt.city || "";
    return name.toLowerCase().includes(q);
  });

  const exactMatch = options.some((opt) => {
    const name = opt.client || opt.name || opt.city || "";
    return name.toLowerCase() === query.trim().toLowerCase();
  });

  const handleSelect = (selectedValue, selectedOption) => {
    const val = selectedValue.toLowerCase();
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

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
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
            maxHeight: "250px", 
            overflowY: "auto", 
            zIndex: 100,
            padding: "0.5rem",
            background: "#ffffff",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
          }}
        >
          {filteredOptions.length > 0 && filteredOptions.map((opt, idx) => {
            const name = opt.client || opt.name || opt.city || "";
            return (
              <div 
                key={opt.id || idx}
                onClick={() => handleSelect(name, opt)}
                style={{ 
                  padding: "0.75rem", 
                  cursor: "pointer",
                  borderRadius: "6px",
                  transition: "background 0.2s",
                  color: "var(--text-color)",
                  fontWeight: 500,
                  textTransform: "uppercase"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(13, 110, 253, 0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {name}
              </div>
            );
          })}

          {!exactMatch && query.trim() !== "" && query !== value && (
            <div 
              onClick={() => {
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
                padding: "0.75rem", 
                cursor: "pointer",
                borderRadius: "6px",
                transition: "background 0.2s",
                color: "var(--primary-color)",
                fontWeight: 600,
                borderTop: filteredOptions.length > 0 ? "1px solid rgba(0, 0, 0, 0.05)" : "none",
                marginTop: filteredOptions.length > 0 ? "4px" : "0",
                textTransform: "uppercase"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(13, 110, 253, 0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Plus size={16} /> Add "{query.trim()}"
            </div>
          )}

          {filteredOptions.length === 0 && (exactMatch || query.trim() === "") && (
             <div style={{ padding: "0.75rem", color: "var(--text-muted)", textAlign: "center", fontSize: "0.9rem" }}>
               No options found. Type to add.
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatableDropdown;
