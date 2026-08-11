import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Phone, Calendar, CheckCircle, Trash2, Clock, Inbox } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';

const ContactSubmissions = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const { addToast } = useToast();

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/contacts`);
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      addToast('Failed to load contact submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleResolve = async (id) => {
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/contacts/${id}/resolve`);
      if (response.data.success) {
        addToast('Marked as resolved', 'success');
        fetchContacts();
      }
    } catch (error) {
      console.error('Failed to resolve contact:', error);
      addToast('Failed to mark as resolved', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/contacts/${id}`);
      if (response.data.success) {
        addToast('Message deleted', 'success');
        fetchContacts();
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      addToast('Failed to delete message', 'error');
    }
  };

  const filteredContacts = contacts.filter(c => {
    if (filter === 'All') return true;
    return c.status === filter;
  });

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Inject responsive styles if not already present
  const responsiveStyles = `
    .contact-table-row {
      transition: all 0.2s ease;
    }
    .contact-table-row:hover {
      background-color: #f1f5f9 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .status-badge {
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .btn-action {
      padding: 0.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-action:hover {
      transform: scale(1.05);
    }
    .btn-resolve {
      background-color: #e0e7ff;
      color: #4f46e5;
    }
    .btn-resolve:hover {
      background-color: #c7d2fe;
    }
    .btn-delete {
      background-color: #fee2e2;
      color: #ef4444;
    }
    .btn-delete:hover {
      background-color: #fecaca;
    }
    .contact-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    @media (max-width: 768px) {
      .contact-header {
        flex-direction: column;
      }
      .filter-buttons {
        width: 100%;
        display: flex;
      }
      .filter-buttons button {
        flex: 1;
      }
    }
  `;

  return (
    <div className="page-content" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{responsiveStyles}</style>
      <div className="contact-header">
        <div>
          <h3 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 0.5rem 0', fontWeight: '700', letterSpacing: '-0.025em' }}>Contact Queries</h3>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Manage public messages and inquiries from the website</p>
        </div>
        <div className="filter-buttons" style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '12px' }}>
          {['All', 'New', 'Resolved'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: filter === f ? '#ffffff' : 'transparent',
                color: filter === f ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                fontWeight: filter === f ? '600' : '500',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
            <Inbox size={56} style={{ margin: '0 auto 1.5rem', opacity: 0.3, color: '#64748b' }} />
            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>No contact queries found.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try changing your filter settings.</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', width: '20%' }}>Sender Info</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', width: '20%' }}>Subject</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', width: '35%' }}>Message</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', width: '10%' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#64748b', fontWeight: '600', fontSize: '0.85rem', width: '15%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className="contact-table-row" style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: contact.status === 'New' ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '0.35rem', fontSize: '0.95rem' }}>{contact.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <Mail size={14} style={{ color: '#94a3b8' }}/> <a href={`mailto:${contact.email}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>{contact.email}</a>
                      </div>
                      {contact.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                          <Phone size={14} style={{ color: '#94a3b8' }}/> {contact.phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{contact.subject}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                        <Calendar size={12} /> {formatDate(contact.createdAt)}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                      <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        {contact.message}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                      <span className="status-badge" style={{ 
                        backgroundColor: contact.status === 'New' ? '#fef3c7' : '#dcfce7',
                        color: contact.status === 'New' ? '#d97706' : '#15803d',
                        border: `1px solid ${contact.status === 'New' ? '#fde68a' : '#bbf7d0'}`
                      }}>
                        {contact.status === 'New' ? <Clock size={14} /> : <CheckCircle size={14} />}
                        {contact.status}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        {contact.status === 'New' && (
                          <button
                            onClick={() => handleResolve(contact.id)}
                            title="Mark as Resolved"
                            className="btn-action btn-resolve"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(contact.id)}
                          title="Delete Message"
                          className="btn-action btn-delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactSubmissions;
