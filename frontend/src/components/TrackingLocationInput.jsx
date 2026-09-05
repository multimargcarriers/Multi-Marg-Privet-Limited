import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { getSuggestions } from "../utils/smartSuggestions";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://localhost:5000/api";

const cleanStr = (s) => String(s || "").trim().toUpperCase();

// Generate clean transit variants: City, City Airport, City Station, City Hub
const generateVariants = (cityName) => {
  const c = cleanStr(cityName);
  if (!c || c.length < 2) return [];

  const base = c
    .replace(/\s+(AIRPORT|STATION|RAILWAY STATION|HUB|FACILITY)$/i, "")
    .trim();

  return [
    base,
    `${base} AIRPORT`,
    `${base} STATION`,
    `${base} HUB`
  ];
};

const TrackingLocationInput = ({
  value = "",
  onChange,
  booking,
  bulkBookings = [],
  placeholder = "ENTER LOCATION...",
  required = false,
  id = "trackingLocationInput",
  name = "location",
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [ipCity, setIpCity] = useState(() => {
    try {
      return sessionStorage.getItem("detected_ip_city") || "";
    } catch (_e) {
      return "";
    }
  });
  const [dbCities, setDbCities] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch IP location silently for suggestions
  useEffect(() => {
    if (ipCity) return;
    let isMounted = true;

    async function detectLocation() {
      try {
        const res = await axios.get(`${API}/suggestions/ip-location`, { timeout: 3500 }).catch(() => null);
        if (res?.data?.success && res.data.city) {
          const detected = cleanStr(res.data.city);
          if (isMounted && detected) {
            setIpCity(detected);
            try { sessionStorage.setItem("detected_ip_city", detected); } catch (_e) {}
            return;
          }
        }

        const fbRes = await axios.get("https://ipwho.is/", { timeout: 3500 }).catch(() => null);
        if (fbRes?.data?.city && isMounted) {
          const detected = cleanStr(fbRes.data.city);
          setIpCity(detected);
          try { sessionStorage.setItem("detected_ip_city", detected); } catch (_e) {}
        }
      } catch (_e) {}
    }

    detectLocation();
    return () => { isMounted = false; };
  }, [ipCity]);

  // Fetch master cities
  useEffect(() => {
    let isMounted = true;
    axios.get(`${API}/cities`, { timeout: 4000 })
      .then(res => {
        if (isMounted && res.data?.success && Array.isArray(res.data.data)) {
          const names = res.data.data.map(c => cleanStr(c.city || c.name)).filter(Boolean);
          setDbCities(names);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Build clean, simple suggestions list
  const allSuggestions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addVal = (val) => {
      if (!val) return;
      const clean = cleanStr(val);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push(clean);
      }
    };

    // 1. IP Detected City variants
    if (ipCity) {
      generateVariants(ipCity).forEach(addVal);
    }

    // 2. Route Origin variants
    if (booking?.origin) {
      generateVariants(booking.origin).forEach(addVal);
    }
    // 3. Route Destination variants
    if (booking?.destination) {
      generateVariants(booking.destination).forEach(addVal);
    }
    // 4. Current Location variants
    if (booking?.currentLocation) {
      generateVariants(booking.currentLocation).forEach(addVal);
    }

    // Multi-bookings route cities
    if (Array.isArray(bulkBookings)) {
      bulkBookings.slice(0, 10).forEach(b => {
        if (b.origin) generateVariants(b.origin).forEach(addVal);
        if (b.destination) generateVariants(b.destination).forEach(addVal);
      });
    }

    // 5. Smart recent city suggestions
    const smartCities = getSuggestions("city", "", 20);
    smartCities.forEach(item => {
      const name = typeof item === "string" ? item : (item?.city || item?.name || "");
      if (name) generateVariants(name).forEach(addVal);
    });

    // 6. Master DB cities
    dbCities.slice(0, 25).forEach(name => {
      generateVariants(name).forEach(addVal);
    });

    return list;
  }, [ipCity, booking, bulkBookings, dbCities]);

  // Filter based on input
  const filteredSuggestions = useMemo(() => {
    const q = (query || "").trim().toUpperCase();
    if (!q) {
      return allSuggestions.slice(0, 12);
    }

    return allSuggestions
      .filter(item => item.includes(q))
      .slice(0, 15);
  }, [allSuggestions, query]);

  const handleSelect = (chosenVal) => {
    const finalVal = cleanStr(chosenVal);
    setQuery(finalVal);
    setIsOpen(false);
    if (onChange) {
      onChange(finalVal);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
    if (onChange) {
      onChange(val);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      if (onChange) {
        onChange((query || "").trim().toUpperCase());
      }
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", ...style }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={id}
          name={name}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "0.65rem 2.2rem 0.65rem 0.85rem",
            borderRadius: "8px",
            border: isOpen ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
            fontSize: "0.88rem",
            fontWeight: 700,
            textTransform: "uppercase",
            outline: "none",
            boxSizing: "border-box",
            background: "#ffffff",
            boxShadow: isOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
            transition: "all 0.15s ease"
          }}
        />
        <div
          onClick={() => setIsOpen(prev => !prev)}
          style={{
            position: "absolute",
            right: "10px",
            cursor: "pointer",
            color: "#64748b",
            display: "flex",
            alignItems: "center"
          }}
        >
          <ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </div>
      </div>

      {/* Simple, Compact Suggestion Dropdown - ONLY shown when matching suggestions exist */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 999999,
            maxHeight: "220px",
            overflowY: "auto",
            padding: "4px"
          }}
        >
          {filteredSuggestions.map((cityName, idx) => {
            const isSelected = query.trim().toUpperCase() === cityName;
            const isHighlighted = highlightedIndex === idx;
            return (
              <div
                key={`${cityName}-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(cityName);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: isHighlighted ? "#eff6ff" : (isSelected ? "#f8fafc" : "transparent"),
                  transition: "background 0.1s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "7px", overflow: "hidden" }}>
                  <MapPin size={13} color={isSelected ? "#2563eb" : "#94a3b8"} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: isSelected ? "#2563eb" : "#1e293b", textTransform: "uppercase" }}>
                    {cityName}
                  </span>
                </div>
                {isSelected && <Check size={13} color="#2563eb" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrackingLocationInput;
