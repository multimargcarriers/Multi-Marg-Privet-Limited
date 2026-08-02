import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Download, Upload, FileText } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const CsvImportExport = ({ moduleName, onImportSuccess }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/csv/export/${moduleName}`, {
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
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <button 
        onClick={handleExport}
        disabled={isExporting}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.4rem 0.8rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
      >
        <Download size={14} />
        {isExporting ? "Exporting..." : "Export CSV"}
      </button>

      <button 
        onClick={handleDownloadSample}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.4rem 0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer' }}
      >
        <FileText size={14} />
        Sample CSV
      </button>

      <input 
        type="file" 
        accept=".csv" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <button 
        onClick={triggerFileInput}
        disabled={isImporting}
        className="btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.4rem 0.8rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        <Upload size={14} />
        {isImporting ? "Importing..." : "Import CSV"}
      </button>
    </div>
  );
};

export default CsvImportExport;
