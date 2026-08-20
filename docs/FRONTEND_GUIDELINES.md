# 🎨 Frontend Architecture & UI/UX Guidelines

---

## 1. Design System & Component Layout

* **Vanilla CSS / Custom Design System**: Main styles reside in `frontend/src/index.css`.
* **Clean Modern Aesthetics**: HSL harmonious colors, soft gradients, rounded corners (`border-radius: 8px - 12px`), and subtle glassmorphic panels (`.glass-panel`).
* **Responsive Layouts**: Flexible grids with `clamp()` typography and CSS media queries.

---

## 2. Modal Dialog Portal Architecture (Mandatory Rule)

All modal dialogs must follow the React Portal pattern using `createPortal(..., document.body)` so they render fixed over the viewport regardless of parent scroll position.

### Structure:
```jsx
{showModal && createPortal(
  <div className="modal-overlay" onClick={handleClose}>
    <div className="modal-dialog-card" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header-section">
        <h3>Modal Title</h3>
        <button onClick={handleClose}><X size={18} /></button>
      </div>
      <form onSubmit={handleSave} className="modal-form-container">
        <div className="modal-body-section">
          {/* Scrollable form inputs */}
        </div>
        <div className="modal-footer-section">
          <button type="button" onClick={handleClose}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  </div>,
  document.body
)}
```

### Scroll Locking:
```javascript
useEffect(() => {
  if (showModal) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
  return () => { document.body.style.overflow = ""; };
}, [showModal]);
```

---

## 3. Form Draft State Persistence Pattern

All key data entry forms (`OpeningOutstanding.jsx`, `TdsDebtManagement.jsx`, `TripMIS.jsx`) must persist unsubmitted form inputs in `sessionStorage` to guard against accidental page refreshes:

```javascript
// Initialize from sessionStorage or default
const [form, setForm] = useState(() => {
  try {
    const saved = sessionStorage.getItem("draft_key");
    return saved ? JSON.parse(saved) : initialFormState;
  } catch {
    return initialFormState;
  }
});

// Auto-save on modification
useEffect(() => {
  if (!editingId) {
    sessionStorage.setItem("draft_key", JSON.stringify(form));
  }
}, [form, editingId]);

// Clear on successful submission
const handleSubmit = async () => {
  // on success:
  sessionStorage.removeItem("draft_key");
  setForm(initialFormState);
};
```

---

## 4. Single-Line Table Action Buttons

Table action buttons (Edit, Delete, Print, Download) must be rendered in a single horizontal row with `white-space: nowrap`, `display: flex`, and `gap: 6px` to prevent multi-line button wrapping on smaller screens.
