import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import { Download, Upload, FileText, } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { SettingsContext } from '../context/SettingsContext';

const CsvImportExport = ({ moduleName, onImportSuccess, searchQuery }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [_isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const { addToast } = useToast();
  const { globalSettings } = useContext(SettingsContext);
  const enableCsvImport = globalSettings?.integrations?.enableCsvImport !== false;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      let exportUrl = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/csv/export/${moduleName}`;
      if (searchQuery) exportUrl += `?search=${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(exportUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${moduleName}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Export successful", "success");
    } catch (err) {
      console.error("Export failed:", err);
      addToast("Failed to export data", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/csv/sample/${moduleName}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${moduleName}_sample.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Sample downloaded", "success");
    } catch (err) {
      console.error("Sample download failed:", err);
      addToast("Failed to download sample", "error");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      addToast("Only CSV files are allowed", "error");
      fileInputRef.current.value = "";
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("csvFile", file);

      const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/csv/import/${moduleName}`, formData, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        addToast(response.data.message || "Import successful", "success");
        if (onImportSuccess) onImportSuccess();
      } else {
        addToast(response.data.message || "Import failed", "error");
      }
    } catch (err) {
      console.error("Import failed:", err);
      const msg = err.response?.data?.message || "Failed to import CSV. Please ensure you are using the correct sample format.";
      addToast(msg, "error");
    } finally {
      setIsImporting(false);
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', flexShrink: 0 }}>
      {enableCsvImport && (
        <button 
          onClick={handleDownloadSample}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.45rem 0.8rem', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0ea5e9'; e.currentTarget.style.borderColor = '#bae6fd'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
        >
          <FileText size={14} /> Template
        </button>
      )}

      <button 
        onClick={handleExport}
        disabled={isExporting}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.45rem 0.8rem', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: isExporting ? 'not-allowed' : 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
        onMouseOver={(e) => { if(!isExporting) { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = '#94a3b8'; } }}
        onMouseOut={(e) => { if(!isExporting) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
      >
        <Download size={14} /> {isExporting ? "..." : "Export"}
      </button>

      {enableCsvImport && (
        <>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 0.25rem' }}></div>

          <button 
            onClick={triggerFileInput}
            disabled={isImporting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.45rem 0.8rem', backgroundColor: '#0ea5e9', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: isImporting ? 'not-allowed' : 'pointer', fontWeight: '600', boxShadow: '0 1px 2px 0 rgba(14, 165, 233, 0.4)', transition: 'all 0.2s' }}
            onMouseOver={(e) => { if(!isImporting) e.currentTarget.style.backgroundColor = '#0284c7'; }}
            onMouseOut={(e) => { if(!isImporting) e.currentTarget.style.backgroundColor = '#0ea5e9'; }}
          >
            <Upload size={14} /> {isImporting ? "..." : "Import CSV"}
          </button>
        </>
      )}

      <input 
        type="file" 
        accept=".csv" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={(e) => { handleFileChange(e); setIsOpen(false); }}
      />
    </div>
  );
};

export default CsvImportExport;
