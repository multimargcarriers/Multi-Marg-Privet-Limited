import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useDialog } from "../../context/DialogContext";
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Trash2,
  AlertOctagon,
  Archive,
  Star,
  RefreshCw,
  Plus,
  Search,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  CheckSquare,
  Square,
  ArrowLeft,
  Download,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle,
  Clock,
  User,
  Users,
  Settings,
  Sparkles,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Minus,
  Trash,
  Filter,
  Menu,
  Printer,
  ChevronDown,
  CornerDownRight,
  Share2,
  Tag,
  Folder,
  SlidersHorizontal,
  HardDrive,
  LogOut,
  UserPlus,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Smart Message Body Cleaner & Signature Collapser
 * Shows the actual human message cleanly and collapses legal notices/signatures into a toggle.
 */
const SmartCleanMessage = ({ text, html }) => {
  const [showFullDetails, setShowFullDetails] = useState(false);

  if (html && typeof html === "string" && html.trim()) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: html.replace(/&amp;nbsp;/gi, "&nbsp;") }}
        style={{ wordBreak: "break-word", overflowX: "auto" }}
      />
    );
  }

  const raw = (text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // Clean lines of quote markers and brackets
  const lines = raw
    .split("\n")
    .map(l => l.replace(/^>\s*/, "").replace(/^>\s*/, "").trimEnd());

  // Detect signature / legal notice / links split points
  let splitIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toUpperCase();
    if (
      line === "--" ||
      line.startsWith("CONFIDENTIALITY NOTICE") ||
      line.startsWith("DISCLAIMER:") ||
      line.startsWith("LINKS:") ||
      line.startsWith("------") ||
      line.startsWith("PLEASE CONSIDER THE ENVIRONMENT") ||
      line.startsWith("TRANSPORT SUITE:") ||
      line.startsWith("ACCOUNTS & IT HEAD")
    ) {
      splitIndex = i;
      break;
    }
  }

  // Also strip "ON ... WROTE:" header if at the beginning of the block
  let startIdx = 0;
  if (lines.length > 0 && /ON\s+\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}.*?WROTE:/i.test(lines[0].trim())) {
    startIdx = 1;
  }

  let mainLines = splitIndex !== -1 ? lines.slice(startIdx, splitIndex) : lines.slice(startIdx);
  let extraLines = splitIndex !== -1 ? lines.slice(splitIndex) : [];

  // Filter empty leading/trailing lines
  const mainText = mainLines.filter(l => !l.startsWith(">")).join("\n").trim();
  const extraText = extraLines.join("\n").trim();

  return (
    <div style={{ color: "#1e293b", fontSize: "14px", lineHeight: "1.6" }}>
      {/* Primary Clean Human Message */}
      <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", whiteSpace: "pre-wrap" }}>
        {mainText || raw}
      </div>

      {/* Signature & Legal Disclaimers (Collapsible) */}
      {extraText && (
        <div style={{ marginTop: "12px" }}>
          {!showFullDetails ? (
            <button
              type="button"
              onClick={() => setShowFullDetails(true)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                padding: "3px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "700",
                color: "#64748b",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>... Show Signature &amp; Legal Notice</span>
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{
                marginTop: "8px",
                padding: "10px 14px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px dashed #cbd5e1",
                fontSize: "12px",
                color: "#64748b",
                whiteSpace: "pre-wrap"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>Signature &amp; Legal Notice</span>
                <button
                  type="button"
                  onClick={() => setShowFullDetails(false)}
                  style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", fontWeight: "700" }}
                >
                  Hide
                </button>
              </div>
              {extraText}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Gmail-Style Trimmed Content Component
 */
const TrimmedEmailBody = ({ html, text }) => {
  return <SmartCleanMessage html={html} text={text} />;
};

const Webmail = () => {
  const { user, token } = useContext(AuthContext);
  const { addToast } = useToast();
  const { confirm } = useDialog();

  const isSuperAdmin = user?.role === "SuperAdmin" || user?.email === "admin@multimarg.com";

  // Screen size breakpoint detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  // Mobile active pane: 'list' | 'reader'
  const [mobileView, setMobileView] = useState("list");
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const [isMobileAccountModalOpen, setIsMobileAccountModalOpen] = useState(false);

  // State: Accounts (Persisted in localStorage)
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(() => localStorage.getItem("multimarg_webmail_last_account_id") || null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Account Limits Metadata
  const [accountMeta, setAccountMeta] = useState({ isSuperAdmin: false, maxAllowed: 1, currentCount: 0, canAddMore: true });

  // Connect Account Form State
  const [connectForm, setConnectForm] = useState({
    email: isSuperAdmin ? "" : user?.email || "",
    password: "",
    displayName: user?.name || "",
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    smtpSecure: true
  });
  const [connecting, setConnecting] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // State: Mailbox & Messages (Persisted in localStorage)
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(() => localStorage.getItem("multimarg_webmail_last_folder") || "INBOX");
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'unseen', 'flagged'

  // State: Selected Message & Threaded Replies (Persisted in localStorage)
  const [selectedUid, setSelectedUid] = useState(() => {
    const saved = localStorage.getItem("multimarg_webmail_last_uid");
    return saved ? parseInt(saved, 10) || saved : null;
  });
  const [messageDetail, setMessageDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [threadReplies, setThreadReplies] = useState([]); // Real-time session replies
  const [expandedThreadUids, setExpandedThreadUids] = useState({});
  const [isFullscreenReader, setIsFullscreenReader] = useState(false);

  // State: Selection for Bulk Actions
  const [selectedUids, setSelectedUids] = useState([]);
  const [hoveredUid, setHoveredUid] = useState(null);

  // Helper to load persisted sender info with user IAM profile fallbacks
  const getInitialSenderInfo = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("multimarg_webmail_sender_info") || "{}");
      return {
        senderName: saved.senderName || user?.name || "",
        senderDesignation: saved.senderDesignation || user?.designation || (user?.role === "SuperAdmin" ? "Super Admin" : user?.role || ""),
        senderPhone: saved.senderPhone || user?.phone || user?.phoneNumber || ""
      };
    } catch {
      return {
        senderName: user?.name || "",
        senderDesignation: user?.designation || (user?.role === "SuperAdmin" ? "Super Admin" : user?.role || ""),
        senderPhone: user?.phone || user?.phoneNumber || ""
      };
    }
  };

  const initialSender = getInitialSenderInfo();

  // State: Compose Floating Modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const [isComposeExpanded, setIsComposeExpanded] = useState(false);
  const [isComposeMaximized, setIsComposeMaximized] = useState(false);
  const [composeData, setComposeData] = useState({
    fromAccountId: "",
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
    attachments: [],
    inReplyTo: "",
    references: "",
    senderName: initialSender.senderName,
    senderDesignation: initialSender.senderDesignation,
    senderPhone: initialSender.senderPhone
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showCustomSigner, setShowCustomSigner] = useState(Boolean(initialSender.senderName || initialSender.senderDesignation || initialSender.senderPhone));
  const [sendingMail, setSendingMail] = useState(false);

  // Sync user profile updates to composeData if fields are empty
  useEffect(() => {
    if (user) {
      setComposeData(prev => ({
        ...prev,
        senderName: prev.senderName || user.name || "",
        senderDesignation: prev.senderDesignation || user.designation || (user.role === "SuperAdmin" ? "Super Admin" : user.role || ""),
        senderPhone: prev.senderPhone || user.phone || user.phoneNumber || ""
      }));
    }
  }, [user]);

  // Persist custom sender info changes
  const updateSenderInfo = (field, value) => {
    setComposeData(prev => {
      const next = { ...prev, [field]: value };
      try {
        localStorage.setItem("multimarg_webmail_sender_info", JSON.stringify({
          senderName: next.senderName,
          senderDesignation: next.senderDesignation,
          senderPhone: next.senderPhone
        }));
      } catch {}
      return next;
    });
  };

  // State: Collapsible Quick Reply (Hidden until user clicks Reply on Mobile)
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [sendingQuickReply, setSendingQuickReply] = useState(false);

  const messagesEndRef = useRef(null);

  // State: Topbar Account Switcher Dropdown
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Resize listener for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsTablet(tablet);
      if (!mobile && mobileView !== "list") {
        setMobileView("list");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileView]);

  // Auth Header helper
  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  // Fetch Accounts on mount with persistent last opened account restoration
  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const res = await axios.get(`${API_BASE}/api/webmail/accounts`, authHeaders);
      if (res.data.success) {
        const accs = res.data.data || [];
        setAccounts(accs);
        if (res.data.meta) {
          setAccountMeta(res.data.meta);
        }
        if (accs.length > 0) {
          const savedAccId = localStorage.getItem("multimarg_webmail_last_account_id");
          if (savedAccId && accs.some(a => a.id === savedAccId)) {
            setSelectedAccountId(savedAccId);
          } else if (!selectedAccountId || !accs.some(a => a.id === selectedAccountId)) {
            const defaultAcc = accs.find(a => a.isDefault || a.isSystemDefault) || accs[0];
            setSelectedAccountId(defaultAcc.id);
            localStorage.setItem("multimarg_webmail_last_account_id", defaultAcc.id);
          }
        } else {
          setSelectedAccountId(null);
        }
      }
    } catch (err) {
      console.error("Error fetching mail accounts:", err);
      addToast(err.response?.data?.message || "Failed to load mail accounts", "error");
    } finally {
      setLoadingAccounts(false);
    }
  }, [token, selectedAccountId]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch Folders when selected account changes
  const fetchFolders = useCallback(async () => {
    if (!selectedAccountId) {
      setFolders([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/webmail/folders?accountId=${selectedAccountId}`, authHeaders);
      if (res.data.success) {
        setFolders(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  }, [selectedAccountId, token]);

  // Fetch Messages with optional silent background refresh and auto-open last email
  const fetchMessages = useCallback(async (resetPage = false, silent = false) => {
    if (!selectedAccountId) {
      setMessages([]);
      return;
    }
    try {
      if (!silent) setLoadingMessages(true);
      const currentPage = resetPage ? 1 : page;
      if (resetPage) setPage(1);

      const params = new URLSearchParams({
        accountId: selectedAccountId,
        folder: currentFolder,
        page: currentPage.toString(),
        limit: "35",
        search: searchQuery,
        filter: activeFilter
      });

      const res = await axios.get(`${API_BASE}/api/webmail/messages?${params.toString()}`, authHeaders);
      if (res.data.success) {
        const fetchedList = res.data.data || [];
        setMessages(fetchedList);
        setTotalMessages(res.data.meta?.total || 0);
        setTotalPages(res.data.meta?.totalPages || 1);

        // Auto-restore last opened email if exists in list and not yet loaded
        const savedUid = localStorage.getItem("multimarg_webmail_last_uid");
        if (savedUid && fetchedList.some(m => String(m.uid) === String(savedUid)) && !messageDetail) {
          fetchMessageDetail(parseInt(savedUid, 10) || savedUid);
        }
      }
    } catch (err) {
      if (!silent) {
        console.error("Error fetching messages:", err);
        addToast(err.response?.data?.message || "Failed to fetch emails", "error");
      }
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [selectedAccountId, currentFolder, page, searchQuery, activeFilter, token, messageDetail]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchFolders();
      fetchMessages(true);
      setThreadReplies([]);
      setSelectedUids([]);
    }
  }, [selectedAccountId, currentFolder, activeFilter]);

  // Silent Background Auto-Sync every 45s (Gmail heartbeat)
  useEffect(() => {
    if (!selectedAccountId) return;
    const interval = setInterval(() => {
      fetchFolders();
      fetchMessages(false, true);
    }, 45000);
    return () => clearInterval(interval);
  }, [selectedAccountId, currentFolder, page, searchQuery, activeFilter]);

  // Fetch Full Message Detail and persist UID
  const fetchMessageDetail = async (uid) => {
    if (!selectedAccountId || !uid) return;
    try {
      setLoadingDetail(true);
      setSelectedUid(uid);
      localStorage.setItem("multimarg_webmail_last_uid", String(uid));
      setThreadReplies([]);
      setIsQuickReplyOpen(false); // Collapsed by default on mobile
      if (isMobile) setMobileView("reader");

      const res = await axios.get(
        `${API_BASE}/api/webmail/messages/${uid}?accountId=${selectedAccountId}&folder=${encodeURIComponent(currentFolder)}`,
        authHeaders
      );
      if (res.data.success) {
        setMessageDetail(res.data.data);
        // Instant Optimistic Seen update in local list
        setMessages(prev => prev.map(m => (m.uid === uid ? { ...m, isSeen: true } : m)));
        fetchFolders();
      }
    } catch (err) {
      console.error("Error loading message detail:", err);
      addToast("Failed to load message content", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Connect Account Handler
  const handleConnectAccount = async (e) => {
    e.preventDefault();
    if (!connectForm.email || !connectForm.password) {
      addToast("Please provide both email and password", "warning");
      return;
    }

    try {
      setConnecting(true);
      const res = await axios.post(`${API_BASE}/api/webmail/accounts`, connectForm, authHeaders);
      if (res.data.success) {
        addToast("Hostinger Business Mail connected successfully!", "success");
        setIsConnectModalOpen(false);
        setIsMobileAccountModalOpen(false);
        setConnectForm({
          email: isSuperAdmin ? "" : user?.email || "",
          password: "",
          displayName: user?.name || "",
          imapHost: "imap.hostinger.com",
          imapPort: 993,
          imapSecure: true,
          smtpHost: "smtp.hostinger.com",
          smtpPort: 465,
          smtpSecure: true
        });
        await fetchAccounts();
        if (res.data.data?.id) {
          setSelectedAccountId(res.data.data.id);
        }
      }
    } catch (err) {
      console.error("Connect error:", err);
      addToast(err.response?.data?.message || "Failed to verify and connect mail account", "error");
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Account Handler
  const handleDisconnectAccount = async (accId, email) => {
    const isConfirmed = await confirm({
      title: "Disconnect Mailbox?",
      message: `Are you sure you want to disconnect ${email}? Your actual emails on Hostinger will remain safe.`,
      confirmText: "Disconnect",
      confirmVariant: "danger"
    });

    if (!isConfirmed) return;

    try {
      const res = await axios.delete(`${API_BASE}/api/webmail/accounts/${accId}`, authHeaders);
      if (res.data.success) {
        addToast("Account disconnected", "success");
        await fetchAccounts();
        setIsMobileAccountModalOpen(false);
      }
    } catch (err) {
      console.error("Error disconnecting account:", err);
      addToast("Failed to disconnect account", "error");
    }
  };

  // Toggle Star / Flag on message (Optimistic Real-time)
  const handleToggleStar = async (e, msg) => {
    e.stopPropagation();
    if (!selectedAccountId) return;
    const isCurrentlyFlagged = msg.isFlagged;
    const newFlagState = !isCurrentlyFlagged;

    setMessages(prev => prev.map(m => m.uid === msg.uid ? { ...m, isFlagged: newFlagState } : m));
    if (messageDetail && messageDetail.uid === msg.uid) {
      setMessageDetail(prev => ({ ...prev, isFlagged: newFlagState }));
    }

    try {
      await axios.post(`${API_BASE}/api/webmail/flags`, {
        accountId: selectedAccountId,
        folder: currentFolder,
        uids: [msg.uid],
        addFlags: newFlagState ? ["\\Flagged"] : [],
        removeFlags: !newFlagState ? ["\\Flagged"] : []
      }, authHeaders);
    } catch (err) {
      console.error("Error toggling star:", err);
      setMessages(prev => prev.map(m => m.uid === msg.uid ? { ...m, isFlagged: isCurrentlyFlagged } : m));
    }
  };

  // Toggle Read / Unread (Optimistic Real-time)
  const handleToggleReadStatus = async (uids, makeRead) => {
    if (!selectedAccountId || !uids.length) return;
    
    setMessages(prev => prev.map(m => uids.includes(m.uid) ? { ...m, isSeen: makeRead } : m));

    try {
      await axios.post(`${API_BASE}/api/webmail/flags`, {
        accountId: selectedAccountId,
        folder: currentFolder,
        uids,
        addFlags: makeRead ? ["\\Seen"] : [],
        removeFlags: !makeRead ? ["\\Seen"] : []
      }, authHeaders);

      fetchFolders();
      addToast(makeRead ? "Marked as read" : "Marked as unread", "success");
    } catch (err) {
      console.error("Error updating read status:", err);
      addToast("Failed to update status", "error");
    }
  };

  // Move Message(s) to Trash (Instant Optimistic update)
  const handleMoveToTrash = async (uids) => {
    if (!selectedAccountId || !uids.length) return;
    
    const trashFolderObj = folders.find(f => f.role === "trash" || f.path.toUpperCase().includes("TRASH") || f.path.toUpperCase().includes("BIN"));
    const destinationFolder = trashFolderObj ? trashFolderObj.path : "Trash";

    setMessages(prev => prev.filter(m => !uids.includes(m.uid)));
    if (uids.includes(selectedUid)) {
      setSelectedUid(null);
      setMessageDetail(null);
      if (isMobile) setMobileView("list");
    }
    setSelectedUids([]);

    try {
      if (currentFolder.toUpperCase().includes("TRASH") || currentFolder.toUpperCase().includes("BIN")) {
        await axios.delete(`${API_BASE}/api/webmail/messages`, {
          data: { accountId: selectedAccountId, folder: currentFolder, uids },
          ...authHeaders
        });
        addToast("Permanently deleted", "success");
      } else {
        await axios.post(`${API_BASE}/api/webmail/move`, {
          accountId: selectedAccountId,
          sourceFolder: currentFolder,
          destinationFolder,
          uids
        }, authHeaders);
        addToast("Moved to Trash", "success");
      }
      fetchFolders();
    } catch (err) {
      console.error("Error moving to trash:", err);
      addToast("Failed to delete message", "error");
      fetchMessages(false, true);
    }
  };

  // Download Attachment
  const handleDownloadAttachment = (uid, attachment) => {
    const url = `${API_BASE}/api/webmail/messages/${uid}/attachment/${attachment.id}?accountId=${selectedAccountId}&folder=${encodeURIComponent(currentFolder)}`;
    window.open(`${url}&token=${token}`, "_blank");
  };

  // Send Email (Floating Composer)
  const handleSendEmail = async (e) => {
    e.preventDefault();
    const targetAccountId = composeData.fromAccountId || selectedAccountId;
    if (!targetAccountId) {
      addToast("Please select an active mail account first", "warning");
      return;
    }
    if (!composeData.to || !composeData.to.trim()) {
      addToast("Recipient (To) is required", "warning");
      return;
    }

    try {
      setSendingMail(true);
      const formData = new FormData();
      formData.append("accountId", targetAccountId);
      formData.append("to", composeData.to.trim());
      if (composeData.cc) formData.append("cc", composeData.cc.trim());
      if (composeData.bcc) formData.append("bcc", composeData.bcc.trim());
      formData.append("subject", composeData.subject || "(No Subject)");
      formData.append("html", composeData.body || "");
      formData.append("text", (composeData.body || "").replace(/<[^>]*>?/gm, ""));
      if (composeData.inReplyTo) formData.append("inReplyTo", composeData.inReplyTo);
      if (composeData.references) formData.append("references", composeData.references);
      if (composeData.senderName) formData.append("senderName", composeData.senderName.trim());
      if (composeData.senderDesignation) formData.append("senderDesignation", composeData.senderDesignation.trim());
      if (composeData.senderPhone) formData.append("senderPhone", composeData.senderPhone.trim());

      (composeData.attachments || []).forEach(file => {
        formData.append("attachments", file);
      });

      const res = await axios.post(`${API_BASE}/api/webmail/send`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        addToast("Email sent via Hostinger SMTP!", "success");
        
        // Instant Real-Time Session Thread Append
        if (selectedUid && composeData.inReplyTo === messageDetail?.messageId) {
          setThreadReplies(prev => [
            ...prev,
            {
              id: Date.now(),
              senderName: activeAccount?.displayName || activeAccount?.email,
              senderEmail: activeAccount?.email,
              date: new Date().toISOString(),
              body: composeData.body,
              attachments: composeData.attachments.map(f => ({ filename: f.name }))
            }
          ]);
          setMessages(prev => prev.map(m => m.uid === selectedUid ? { ...m, isAnswered: true } : m));
        }

        setIsComposeOpen(false);
        setIsComposeMinimized(false);
        setComposeData({
          to: "",
          cc: "",
          bcc: "",
          subject: "",
          body: "",
          attachments: [],
          inReplyTo: "",
          references: ""
        });
        fetchFolders();
      }
    } catch (err) {
      console.error("Error sending email:", err);
      addToast(err.response?.data?.message || "Failed to send email", "error");
    } finally {
      setSendingMail(false);
    }
  };

  // Instant Real-time Inline Quick Reply Handler
  const handleQuickReply = async () => {
    if (!selectedAccountId) {
      addToast("Please select an active mail account first", "warning");
      return;
    }
    if (!quickReplyText.trim() || !messageDetail) return;
    
    const replyContent = quickReplyText.trim();
    const replyToAddress = messageDetail.replyTo || messageDetail.from?.address;
    const formattedBody = `<p>${replyContent.replace(/\n/g, "<br/>")}</p>`;

    try {
      setSendingQuickReply(true);

      const formData = new FormData();
      formData.append("accountId", selectedAccountId);
      formData.append("to", replyToAddress);
      formData.append("subject", messageDetail.subject.startsWith("Re:") ? messageDetail.subject : `Re: ${messageDetail.subject}`);
      formData.append("html", formattedBody);
      formData.append("text", `${replyContent}\n\n--- Original Message ---\n${messageDetail.text}`);
      if (messageDetail.messageId) {
        formData.append("inReplyTo", messageDetail.messageId);
        formData.append("references", messageDetail.messageId);
      }

      const res = await axios.post(`${API_BASE}/api/webmail/send`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        addToast("Reply sent successfully!", "success");

        // Real-time Instant UI Thread Append
        setThreadReplies(prev => [
          ...prev,
          {
            id: Date.now(),
            senderName: activeAccount?.displayName || activeAccount?.email,
            senderEmail: activeAccount?.email,
            date: new Date().toISOString(),
            body: formattedBody,
            attachments: []
          }
        ]);

        setMessages(prev => prev.map(m => m.uid === selectedUid ? { ...m, isAnswered: true } : m));
        setQuickReplyText("");
        setIsQuickReplyOpen(false); // Auto collapse after send

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Error sending quick reply:", err);
      addToast(err.response?.data?.message || "Failed to send reply", "error");
    } finally {
      setSendingQuickReply(false);
    }
  };

  // Trigger Full Reply in Floating Composer
  const handleOpenReplyModal = (isForward = false) => {
    if (!messageDetail) return;
    const isReply = !isForward;
    const recipient = isReply ? (messageDetail.replyTo || messageDetail.from?.address || "") : "";
    const subjectPrefix = isReply ? (messageDetail.subject.startsWith("Re:") ? "" : "Re: ") : (messageDetail.subject.startsWith("Fwd:") ? "" : "Fwd: ");
    const fullSubject = `${subjectPrefix}${messageDetail.subject}`;
    
    const quoteHeader = `<br/><br/>--- ${isReply ? "Original Message" : "Forwarded Message"} ---<br/><b>From:</b> ${messageDetail.from?.name || ""} &lt;${messageDetail.from?.address}&gt;<br/><b>Date:</b> ${new Date(messageDetail.date).toLocaleString()}<br/><b>Subject:</b> ${messageDetail.subject}<br/><br/>`;
    const quoteBody = messageDetail.html || `<pre>${messageDetail.text}</pre>`;

    setComposeData({
      to: recipient,
      cc: "",
      bcc: "",
      subject: fullSubject,
      body: `<p></p>${quoteHeader}${quoteBody}`,
      attachments: [],
      inReplyTo: isReply ? messageDetail.messageId : "",
      references: isReply ? messageDetail.messageId : ""
    });
    setIsComposeOpen(true);
    setIsComposeMinimized(false);
  };

  // Bulk Selection
  const handleToggleSelectAll = () => {
    if (selectedUids.length === messages.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(messages.map(m => m.uid));
    }
  };

  const handleToggleSingleSelect = (uid, e) => {
    e.stopPropagation();
    setSelectedUids(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  // Helper date formatter (Gmail format)
  const formatEmailDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    }
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const activeAccount = accounts.find(a => a.id === selectedAccountId);

  // Print Email Handler
  const handlePrintEmail = () => {
    if (!messageDetail) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${messageDetail.subject}</title>
          <style>
            body { font-family: -apple-system, Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
            .subject { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
            .meta { font-size: 13px; color: #64748b; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="subject">${messageDetail.subject}</div>
            <div class="meta"><strong>From:</strong> ${messageDetail.from?.name || ""} &lt;${messageDetail.from?.address}&gt;</div>
            <div class="meta"><strong>To:</strong> ${(messageDetail.to || []).map(t => t.address).join(", ")}</div>
            <div class="meta"><strong>Date:</strong> ${new Date(messageDetail.date).toLocaleString()}</div>
          </div>
          <div class="body">${messageDetail.html || messageDetail.text}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div
      className="gmail-workspace"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: isFullscreenReader ? "100vh" : "100%",
        maxHeight: isFullscreenReader ? "100vh" : "100%",
        position: isFullscreenReader ? "fixed" : "relative",
        inset: isFullscreenReader ? 0 : "auto",
        zIndex: isFullscreenReader ? 99999 : 1,
        backgroundColor: "#ffffff",
        borderRadius: "0px",
        overflow: "hidden",
        border: "none",
        boxShadow: "none"
      }}
    >
      
      {/* 1. GMAIL-STYLE TOP SEARCH & WORKSPACE BAR (Ultra-Responsive Single-Line) */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: isMobile ? "6px 8px" : "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
          gap: isMobile ? "6px" : "12px",
          flexWrap: "nowrap",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        {/* Mobile Left: Hamburger Button for Folder Drawer */}
        {isMobile && (
          <button
            onClick={() => setIsSidebarDrawerOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#334155",
              padding: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <Menu size={19} />
          </button>
        )}

        {/* Desktop Left: Brand Identity with Multimarg Company Logo */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "220px", flexShrink: 0 }}>
            <img
              src="/circle_crop_logo.png"
              alt="Multimarg Carriers Logo"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                objectFit: "contain",
                background: "#ffffff",
                padding: "1px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 5px rgba(0,0,0,0.06)"
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.01em" }}>
                  MULTIMARG MAIL
                </span>
                <span style={{ fontSize: "9px", fontWeight: "800", color: "#1d4ed8", backgroundColor: "#eff6ff", padding: "1px 6px", borderRadius: "10px", border: "1px solid #bfdbfe", textTransform: "uppercase" }}>
                  Corporate
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
                <span style={{ fontWeight: "500" }}>{activeAccount ? activeAccount.email : "Multimarg Carriers Pvt Ltd"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Center: Iconic Gmail Search Pill Bar */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: isMobile ? "100%" : "680px", position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#f1f5f9",
              borderRadius: "24px",
              padding: isMobile ? "5px 10px" : "7px 16px",
              border: "1px solid transparent",
              transition: "all 0.2s ease"
            }}
          >
            <Search size={15} style={{ color: "#64748b", marginRight: "6px", flexShrink: 0 }} />
            <input
              type="text"
              placeholder={isMobile ? "Search mail" : "Search in mail..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchMessages(true);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "12.5px",
                color: "#1e293b"
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  fetchMessages(true);
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", padding: "2px", flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Executive Account Switcher Dropdown */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div ref={accountDropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              title={activeAccount ? `${activeAccount.displayName || activeAccount.email} (${activeAccount.email})` : "Switch Mailbox"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "0px" : "6px",
                padding: isMobile ? "3px" : "3px 10px 3px 4px",
                borderRadius: isMobile ? "50%" : "20px",
                backgroundColor: isAccountDropdownOpen ? "#eff6ff" : "#ffffff",
                border: isAccountDropdownOpen ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                height: "32px",
                width: isMobile ? "32px" : "auto",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "800",
                  position: "relative",
                  flexShrink: 0
                }}
              >
                {(activeAccount?.displayName || activeAccount?.email || "M").charAt(0).toUpperCase()}
                <span
                  style={{
                    position: "absolute",
                    bottom: "-1px",
                    right: "-1px",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#16a34a",
                    border: "1px solid #ffffff"
                  }}
                />
              </div>

              {!isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>
                    {(() => {
                      const name = activeAccount?.displayName || (activeAccount?.email ? activeAccount.email.split("@")[0] : "Mailbox");
                      if (name.toLowerCase() === "accounts") return "Accounts";
                      if (activeAccount?.isDefault || activeAccount?.isSystemDefault) return "Corporate Info";
                      return name.replace(/\s*\((?:default|corporate default)\)/gi, "");
                    })()}
                  </span>
                </div>
              )}
            </button>

            {/* Dropdown Menu Popup */}
            <AnimatePresence>
              {isAccountDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: "290px",
                    backgroundColor: "#ffffff",
                    borderRadius: "14px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e2e8f0",
                    padding: "8px",
                    zIndex: 999
                  }}
                >
                  <div style={{ padding: "8px 10px 6px 10px", fontSize: "11px", fontWeight: "800", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Switch Mailbox</span>
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", backgroundColor: "#eff6ff", padding: "2px 6px", borderRadius: "10px" }}>
                      {accounts.length}/{accountMeta.maxAllowed} Active
                    </span>
                  </div>

                  <div style={{ maxHeight: "240px", overflowY: "auto", padding: "4px 0" }}>
                    {accounts.map(acc => {
                      const isSelected = acc.id === selectedAccountId;
                      const isDefault = acc.isDefault || acc.isSystemDefault;

                      return (
                        <div
                          key={acc.id}
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            localStorage.setItem("multimarg_webmail_last_account_id", acc.id);
                            setIsAccountDropdownOpen(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            borderRadius: "8px",
                            backgroundColor: isSelected ? "#eff6ff" : "transparent",
                            border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                            cursor: "pointer",
                            marginBottom: "3px",
                            transition: "all 0.1s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: isSelected ? "#2563eb" : "#e2e8f0",
                                color: isSelected ? "#ffffff" : "#475569",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: "800",
                                flexShrink: 0
                              }}
                            >
                              {(acc.displayName || acc.email).charAt(0).toUpperCase()}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                              <div style={{ fontSize: "12px", fontWeight: isSelected ? "800" : "600", color: isSelected ? "#1d4ed8" : "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {acc.displayName ? acc.displayName.replace(/\s*\((?:default|corporate default)\)/gi, "") : acc.email.split("@")[0]}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {acc.email}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {isSelected && <Check size={15} style={{ color: "#2563eb" }} />}
                            {isSuperAdmin && !isDefault && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDisconnectAccount(acc.id, acc.email);
                                }}
                                title="Disconnect mailbox"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#94a3b8",
                                  cursor: "pointer",
                                  padding: "2px 4px",
                                  fontSize: "14px",
                                  fontWeight: "bold"
                                }}
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Add Account / Limit Bar */}
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "6px", marginTop: "4px" }}>
                    {accountMeta.canAddMore ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountDropdownOpen(false);
                          setConnectForm(prev => ({ ...prev, email: isSuperAdmin ? "" : user?.email || "" }));
                          setIsConnectModalOpen(true);
                        }}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: "8px",
                          backgroundColor: "#f8fafc",
                          border: "1px dashed #93c5fd",
                          color: "#2563eb",
                          fontSize: "12px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          cursor: "pointer"
                        }}
                      >
                        <Plus size={13} />
                        <span>Connect Another Mailbox ({accounts.length}/{accountMeta.maxAllowed})</span>
                      </button>
                    ) : (
                      <div style={{ padding: "6px", textAlign: "center", fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                        Max mailboxes connected ({accounts.length}/{accountMeta.maxAllowed})
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. MAIN 3-PANE WORKSPACE */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        
        {/* Pane A: GMAIL-STYLE LEFT NAVIGATION (Desktop) */}
        <div
          style={{
            width: isTablet ? "190px" : "220px",
            backgroundColor: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: isMobile ? "none" : "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px 12px",
            flexShrink: 0
          }}
        >
          <div>
            {/* Iconic Gmail Floating Pill Compose Button */}
            <button
              onClick={() => {
                if (!activeAccount) {
                  addToast("Please connect a mail account first", "warning");
                  return;
                }
                setComposeData({
                  to: "",
                  cc: "",
                  bcc: "",
                  subject: "",
                  body: "",
                  attachments: [],
                  inReplyTo: "",
                  references: ""
                });
                setIsComposeOpen(true);
                setIsComposeMinimized(false);
              }}
              disabled={!activeAccount}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: "16px",
                backgroundColor: "#c2e7ff",
                color: "#001d35",
                border: "none",
                fontWeight: "700",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: activeAccount ? "pointer" : "not-allowed",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
                marginBottom: "20px",
                opacity: activeAccount ? 1 : 0.6,
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              <Plus size={19} color="#001d35" />
              <span>Compose</span>
            </button>

            {/* Folder Navigation Pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {[
                { key: "INBOX", name: "Inbox", icon: <Inbox size={17} />, role: "inbox" },
                { key: "STARRED", name: "Starred", icon: <Star size={17} />, role: "starred" },
                { key: "SENT", name: "Sent", icon: <Send size={17} />, role: "sent" },
                { key: "DRAFTS", name: "Drafts", icon: <FileText size={17} />, role: "drafts" },
                { key: "TRASH", name: "Trash", icon: <Trash2 size={17} />, role: "trash" },
                { key: "SPAM", name: "Spam", icon: <AlertOctagon size={17} />, role: "spam" }
              ].map(fMeta => {
                const imapFolder = folders.find(f => 
                  f.path.toUpperCase() === fMeta.key || 
                  (f.role && f.role.toLowerCase() === fMeta.role) ||
                  f.path.toUpperCase().includes(fMeta.key)
                );
                const isSelected = currentFolder === (imapFolder ? imapFolder.path : fMeta.key) || 
                                   (fMeta.key === "INBOX" && currentFolder === "INBOX");
                const unseen = imapFolder?.unseen || 0;

                return (
                  <button
                    key={fMeta.key}
                    onClick={() => {
                      if (fMeta.key === "STARRED") {
                        setActiveFilter("flagged");
                      } else {
                        setActiveFilter("all");
                        const targetFolder = imapFolder ? imapFolder.path : fMeta.key;
                        setCurrentFolder(targetFolder);
                        localStorage.setItem("multimarg_webmail_last_folder", targetFolder);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "20px",
                      border: "none",
                      backgroundColor: isSelected ? "#d3e3fd" : "transparent",
                      color: isSelected ? "#041e49" : "#444746",
                      fontWeight: isSelected ? "700" : "500",
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: isSelected ? "#041e49" : "#444746", display: "flex" }}>{fMeta.icon}</span>
                      <span>{fMeta.name}</span>
                    </div>
                    {unseen > 0 && (
                      <span style={{ fontSize: "11px", fontWeight: "700", color: isSelected ? "#041e49" : "#444746" }}>
                        {unseen}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Storage Bar Footer */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <HardDrive size={12} /> Hostinger Cloud
              </span>
              <span style={{ fontWeight: "700" }}>Active</span>
            </div>
            <div style={{ width: "100%", height: "4px", backgroundColor: "#e2e8f0", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: "24%", height: "100%", backgroundColor: "#2563eb", borderRadius: "2px" }} />
            </div>
          </div>
        </div>

        {/* Pane B: GMAIL-STYLE EMAIL LIST */}
        <div
          style={{
            width: isMobile ? "100%" : (selectedUid && !isFullscreenReader ? "380px" : "100%"),
            minWidth: isMobile ? "100%" : "320px",
            backgroundColor: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: isMobile && mobileView !== "list" ? "none" : "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Top Category Tabs (Primary, Starred, Unread) */}
          <div style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#fafafa" }}>
            <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={handleToggleSelectAll}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", color: "#64748b" }}
                  title="Select All"
                >
                  {selectedUids.length > 0 && selectedUids.length === messages.length ? (
                    <CheckSquare size={16} color="#2563eb" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>

                {selectedUids.length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      onClick={() => handleToggleReadStatus(selectedUids, true)}
                      style={{ padding: "3px 8px", fontSize: "11px", fontWeight: "600", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer" }}
                    >
                      Mark Read
                    </button>
                    <button
                      onClick={() => handleMoveToTrash(selectedUids)}
                      style={{ padding: "3px 8px", fontSize: "11px", fontWeight: "600", borderRadius: "6px", border: "1px solid #fee2e2", backgroundColor: "#fef2f2", color: "#ef4444", cursor: "pointer" }}
                    >
                      Delete ({selectedUids.length})
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[
                      { key: "all", label: "All Mail" },
                      { key: "unseen", label: "Unread" },
                      { key: "flagged", label: "Starred" }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        style={{
                          padding: "3px 10px",
                          borderRadius: "14px",
                          fontSize: "11.5px",
                          fontWeight: activeFilter === tab.key ? "700" : "500",
                          backgroundColor: activeFilter === tab.key ? "#d3e3fd" : "#f1f5f9",
                          color: activeFilter === tab.key ? "#041e49" : "#475569",
                          border: "none",
                          cursor: "pointer"
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Counter */}
              <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "600" }}>
                {totalMessages > 0 ? `${(page - 1) * 35 + 1}-${Math.min(page * 35, totalMessages)} of ${totalMessages}` : "0"}
              </div>
            </div>
          </div>

          {/* Email Items Scrollable List */}
          <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#ffffff" }}>
            {loadingMessages ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px auto", color: "#2563eb" }} />
                <p style={{ fontSize: "13px", fontWeight: "600", margin: 0 }}>Syncing Gmail-style feed...</p>
              </div>
            ) : !activeAccount ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <Shield size={32} style={{ color: "#94a3b8", margin: "0 auto 10px auto" }} />
                <h3 style={{ fontSize: "14.5px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" }}>No Mailbox Connected</h3>
                <p style={{ fontSize: "12.5px", color: "#64748b", maxWidth: "240px", margin: "0 auto 14px auto" }}>
                  Connect your business mailbox to manage emails directly.
                </p>
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  style={{ padding: "7px 14px", borderRadius: "8px", backgroundColor: "#2563eb", color: "#fff", border: "none", fontWeight: "600", fontSize: "12.5px", cursor: "pointer" }}
                >
                  Connect Mailbox
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                <Inbox size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                <p style={{ fontSize: "13.5px", fontWeight: "700", margin: "0 0 2px 0", color: "#475569" }}>Folder Empty</p>
                <p style={{ fontSize: "12px", margin: 0 }}>No messages in {currentFolder}.</p>
              </div>
            ) : (
              messages.map(msg => {
                const isSelected = selectedUid === msg.uid;
                const isChecked = selectedUids.includes(msg.uid);
                const isHovered = hoveredUid === msg.uid;

                return (
                  <div
                    key={msg.uid}
                    onMouseEnter={() => setHoveredUid(msg.uid)}
                    onMouseLeave={() => setHoveredUid(null)}
                    onClick={() => fetchMessageDetail(msg.uid)}
                    style={{
                      padding: isMobile ? "12px 14px" : "10px 14px",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isSelected ? "#e8f0fe" : msg.isSeen ? (isHovered ? "#f8fafc" : "#ffffff") : (isHovered ? "#f1f5f9" : "#f8faff"),
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                      position: "relative",
                      borderLeft: !msg.isSeen ? "3px solid #2563eb" : "3px solid transparent"
                    }}
                  >
                    {/* Top Row: Checkbox, Star, Sender Name, Date */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span
                          onClick={(e) => handleToggleSingleSelect(msg.uid, e)}
                          style={{ color: isChecked ? "#2563eb" : "#cbd5e1", cursor: "pointer", display: "flex" }}
                        >
                          {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                        </span>

                        <span
                          onClick={(e) => handleToggleStar(e, msg)}
                          style={{ color: msg.isFlagged ? "#facc15" : "#cbd5e1", cursor: "pointer", display: "flex" }}
                        >
                          <Star size={14} fill={msg.isFlagged ? "#facc15" : "none"} />
                        </span>

                        <span style={{ fontSize: "13px", fontWeight: msg.isSeen ? "500" : "800", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {msg.from?.name || msg.from?.address || "Unknown"}
                        </span>
                      </div>

                      {/* Right: Date or Hover Action Bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        {isHovered && !isMobile ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleReadStatus([msg.uid], !msg.isSeen)}
                              title={msg.isSeen ? "Mark as unread" : "Mark as read"}
                              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px", display: "flex" }}
                            >
                              {msg.isSeen ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            <button
                              onClick={() => handleMoveToTrash([msg.uid])}
                              title="Delete"
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px", display: "flex" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <>
                            {msg.isAnswered && (
                              <span title="Replied" style={{ display: "flex", color: "#2563eb" }}>
                                <CornerDownRight size={12} />
                              </span>
                            )}
                            {msg.hasAttachments && <Paperclip size={12} style={{ color: "#64748b" }} />}
                            <span style={{ fontSize: "11px", color: msg.isSeen ? "#94a3b8" : "#2563eb", fontWeight: msg.isSeen ? "400" : "700" }}>
                              {formatEmailDate(msg.date)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div style={{ fontSize: "12.5px", fontWeight: msg.isSeen ? "400" : "600", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "26px" }}>
                      {msg.subject}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={{ padding: "6px 14px", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fafafa" }}>
              <button
                disabled={page <= 1 || loadingMessages}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "3px", fontSize: "11.5px", fontWeight: "600" }}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages || loadingMessages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "3px", fontSize: "11.5px", fontWeight: "600" }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Pane C: GMAIL CONVERSATION VIEWER (With Collapsible Mobile Quick Reply) */}
        {selectedUid && (!isMobile || mobileView === "reader") ? (
          <div style={{ flex: 1, backgroundColor: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* Top Action Toolbar */}
            <div style={{ padding: "8px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => {
                    setSelectedUid(null);
                    if (isMobile) setMobileView("list");
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "12px", fontWeight: "600", color: "#475569", cursor: "pointer" }}
                >
                  <ArrowLeft size={14} /> <span>Back</span>
                </button>

                {!isMobile && (
                  <>
                    <button
                      onClick={() => handleOpenReplyModal(false)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #2563eb", backgroundColor: "#eff6ff", fontSize: "12px", fontWeight: "700", color: "#1d4ed8", cursor: "pointer" }}
                    >
                      <Reply size={13} /> <span>Reply</span>
                    </button>

                    <button
                      onClick={() => handleOpenReplyModal(true)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 11px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "12px", fontWeight: "600", color: "#334155", cursor: "pointer" }}
                    >
                      <Forward size={13} /> <span>Forward</span>
                    </button>
                  </>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  onClick={handlePrintEmail}
                  title="Print"
                  style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", color: "#475569", cursor: "pointer", display: "flex" }}
                >
                  <Printer size={14} />
                </button>

                {!isMobile && (
                  <button
                    onClick={() => setIsFullscreenReader(!isFullscreenReader)}
                    title={isFullscreenReader ? "Exit Fullscreen" : "Fullscreen View"}
                    style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", color: "#475569", cursor: "pointer", display: "flex" }}
                  >
                    {isFullscreenReader ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                )}

                <button
                  onClick={() => handleToggleReadStatus([selectedUid], false)}
                  title="Mark as Unread"
                  style={{ padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", color: "#475569", cursor: "pointer", display: "flex" }}
                >
                  <Eye size={14} />
                </button>

                <button
                  onClick={() => handleMoveToTrash([selectedUid])}
                  title="Delete"
                  style={{ padding: "6px", borderRadius: "6px", border: "1px solid #fee2e2", backgroundColor: "#fef2f2", color: "#ef4444", cursor: "pointer", display: "flex" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Email Body & Live Conversation Thread */}
            {loadingDetail ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px", color: "#64748b" }}>
                <RefreshCw size={24} className="animate-spin" style={{ color: "#2563eb" }} />
                <span style={{ fontSize: "13px", fontWeight: "600" }}>Loading email...</span>
              </div>
            ) : messageDetail ? (
              <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 16px 80px 16px" : "18px 24px 50px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Header Title */}
                <div>
                  <h1 style={{ fontSize: isMobile ? "17px" : "20px", fontWeight: "800", color: "#0f172a", margin: "0 0 10px 0", lineHeight: "1.3" }}>
                    {messageDetail.subject}
                  </h1>

                  {/* Sender & Recipient Header Card */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)" }}>
                        {(messageDetail.from?.name || messageDetail.from?.address || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a" }}>
                          {messageDetail.from?.name || messageDetail.from?.address}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          From: &lt;{messageDetail.from?.address}&gt; &bull; To: {(messageDetail.to || []).map(t => t.address).join(", ")}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>
                      {new Date(messageDetail.date).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Attachments Section */}
                {messageDetail.attachments && messageDetail.attachments.length > 0 && (
                  <div style={{ padding: "12px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Paperclip size={14} />
                      <span>{messageDetail.attachments.length} Attachment{messageDetail.attachments.length > 1 ? "s" : ""}</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {messageDetail.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 12px",
                            backgroundColor: "#ffffff",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                            maxWidth: "260px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                          }}
                        >
                          <FileText size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: "600", color: "#1e293b" }}>
                            {att.filename}
                          </span>
                          <button
                            onClick={() => handleDownloadAttachment(selectedUid, att)}
                            title="Download"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "2px", display: "flex" }}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Conversation Thread Timeline */}
                {/* WhatsApp-Style Professional Conversation Stream */}
                {(() => {
                  // Build normalized conversation message cards
                  let conversationCards = [];

                  if (messageDetail.thread && messageDetail.thread.length > 1) {
                    conversationCards = messageDetail.thread.map((tMsg, idx) => ({
                      id: tMsg.uid || idx,
                      sender: tMsg.from?.name || tMsg.from?.address || "Unknown",
                      senderEmail: tMsg.from?.address || "",
                      isMe: tMsg.from?.address?.toLowerCase().includes("multimarg.com") || tMsg.from?.address?.toLowerCase().includes("accounts@"),
                      date: tMsg.date,
                      html: tMsg.html,
                      text: tMsg.text,
                      attachments: tMsg.attachments || [],
                      isLatest: idx === messageDetail.thread.length - 1
                    }));
                  } else {
                    // Check if single message has quote history
                    const rawText = messageDetail.text || "";
                    const quoteMatch = rawText.match(/(\n\s*(?:On\s+\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}.*?wrote:|On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},.*?,.*?(?:wrote|said):|---\s*(?:Original|Forwarded) Message\s*---|-----Original Message-----)[\s\S]*)/i);

                    if (quoteMatch && quoteMatch.index > 0) {
                      const replyBody = rawText.substring(0, quoteMatch.index).trim();
                      const quotedBody = quoteMatch[0].trim();

                      // Card 1: Original Sent Message
                      conversationCards.push({
                        id: "quoted-orig",
                        sender: "Accounts (You)",
                        senderEmail: "accounts@multimarg.com",
                        isMe: true,
                        date: messageDetail.date,
                        html: false,
                        text: quotedBody,
                        attachments: [],
                        isOriginalQuote: true
                      });

                      // Card 2: Latest Reply Received
                      conversationCards.push({
                        id: messageDetail.uid || "latest-reply",
                        sender: messageDetail.from?.name || messageDetail.from?.address,
                        senderEmail: messageDetail.from?.address,
                        isMe: false,
                        date: messageDetail.date,
                        html: false,
                        text: replyBody,
                        attachments: messageDetail.attachments || [],
                        isLatest: true
                      });
                    } else {
                      // Standard Single Email
                      conversationCards.push({
                        id: messageDetail.uid || "single",
                        sender: messageDetail.from?.name || messageDetail.from?.address,
                        senderEmail: messageDetail.from?.address,
                        isMe: messageDetail.from?.address?.toLowerCase().includes("multimarg.com"),
                        date: messageDetail.date,
                        html: messageDetail.html,
                        text: messageDetail.text,
                        attachments: messageDetail.attachments || [],
                        isLatest: true
                      });
                    }
                  }

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {conversationCards.map((card, cIdx) => (
                        <motion.div
                          key={card.id || cIdx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            backgroundColor: card.isMe ? "#f0fdf4" : "#ffffff",
                            borderRadius: "14px",
                            border: card.isMe ? "1.5px solid #bbf7d0" : "1px solid #e2e8f0",
                            borderLeft: card.isMe ? "4px solid #16a34a" : "4px solid #2563eb",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                            overflow: "hidden",
                            padding: "16px 20px"
                          }}
                        >
                          {/* Chat Card Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: card.isMe ? "#16a34a" : "#2563eb",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "13px",
                                  fontWeight: "800"
                                }}
                              >
                                {card.isMe ? "Y" : (card.sender || "U").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "13.5px", fontWeight: "800", color: card.isMe ? "#15803d" : "#0f172a" }}>
                                    {card.isMe ? "You (Outgoing Mail)" : card.sender}
                                  </span>
                                  {card.isLatest && (
                                    <span style={{ fontSize: "10px", fontWeight: "800", backgroundColor: card.isMe ? "#dcfce7" : "#dbeafe", color: card.isMe ? "#15803d" : "#1d4ed8", padding: "1px 7px", borderRadius: "10px" }}>
                                      Latest Reply
                                    </span>
                                  )}
                                  {card.isOriginalQuote && (
                                    <span style={{ fontSize: "10px", fontWeight: "800", backgroundColor: "#f1f5f9", color: "#475569", padding: "1px 7px", borderRadius: "10px" }}>
                                      Original Message
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                  &lt;{card.senderEmail}&gt;
                                </div>
                              </div>
                            </div>

                            <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "500" }}>
                              {new Date(card.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </div>
                          </div>

                          {/* Attachments (if any on this card) */}
                          {card.attachments && card.attachments.length > 0 && (
                            <div style={{ marginBottom: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                              {card.attachments.map((att, aIdx) => (
                                <div
                                  key={aIdx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "6px 12px",
                                    backgroundColor: "#ffffff",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "12px",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                                  }}
                                >
                                  <FileText size={15} color="#2563eb" />
                                  <span style={{ fontWeight: "600", color: "#1e293b" }}>{att.filename}</span>
                                  <button
                                    onClick={() => handleDownloadAttachment(selectedUid, att)}
                                    title="Download"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "2px", display: "flex" }}
                                  >
                                    <Download size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Message Body */}
                          <TrimmedEmailBody html={card.html} text={card.text} />
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}

                {/* Live Real-Time Threaded Replies (Appended without refresh) */}
                {threadReplies.map(reply => (
                  <motion.div
                    key={reply.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: "14px",
                      padding: "14px 18px",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderLeft: "4px solid #16a34a",
                      borderRadius: "10px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "800", color: "#15803d" }}>You (Sent Reply)</span>
                        <span style={{ fontSize: "11.5px", color: "#16a34a" }}>&lt;{reply.senderEmail}&gt;</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{new Date(reply.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}</span>
                    </div>
                    <TrimmedEmailBody html={reply.body} text={reply.body} />
                  </motion.div>
                ))}

                <div ref={messagesEndRef} />

                {/* Explicit gap separating all mail content from action buttons */}
                <div style={{ minHeight: "30px", flexShrink: 0 }} />

                {/* ACTION BUTTONS SECTION (Placed cleanly after all emails end) */}
                <div style={{ marginTop: "auto", paddingTop: "18px", borderTop: "1px solid #e2e8f0", paddingBottom: isMobile ? "90px" : "40px", flexShrink: 0 }}>
                  {!isQuickReplyOpen ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => setIsQuickReplyOpen(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 22px",
                          borderRadius: "20px",
                          border: "1.5px solid #2563eb",
                          backgroundColor: "#eff6ff",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "#1d4ed8",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(37, 99, 235, 0.12)"
                        }}
                      >
                        <Reply size={15} /> <span>Reply</span>
                      </button>

                      <button
                        onClick={() => handleOpenReplyModal(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 22px",
                          borderRadius: "20px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#f8fafc",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#334155",
                          cursor: "pointer"
                        }}
                      >
                        <Forward size={15} /> <span>Forward</span>
                      </button>
                    </div>
                  ) : (
                    /* Expanded Smooth Inline Reply Box */
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Reply size={14} />
                          <span>Replying to {messageDetail.from?.name || messageDetail.from?.address}</span>
                        </div>
                        <button
                          onClick={() => setIsQuickReplyOpen(false)}
                          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex" }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
                        <textarea
                          rows={3}
                          placeholder="Write your reply... (Ctrl + Enter to send)"
                          value={quickReplyText}
                          onChange={(e) => setQuickReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              handleQuickReply();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13.5px",
                            outline: "none",
                            resize: "vertical"
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px", justifyContent: isMobile ? "flex-end" : "flex-start" }}>
                          <button
                            onClick={handleQuickReply}
                            disabled={sendingQuickReply || !quickReplyText.trim()}
                            style={{
                              padding: "0 22px",
                              height: "42px",
                              borderRadius: "10px",
                              backgroundColor: "#2563eb",
                              color: "#fff",
                              border: "none",
                              fontWeight: "700",
                              fontSize: "13.5px",
                              cursor: sendingQuickReply || !quickReplyText.trim() ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              opacity: sendingQuickReply || !quickReplyText.trim() ? 0.6 : 1,
                              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)"
                            }}
                          >
                            {sendingQuickReply ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                            <span>{sendingQuickReply ? "Sending" : "Send"}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

              </div>
            ) : null}

          </div>
        ) : (
          /* Empty Placeholder with Official Company Logo */
          <div
            style={{
              flex: 1,
              backgroundColor: "#f8fafc",
              display: isMobile ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: "#94a3b8",
              padding: "40px"
            }}
          >
            <div style={{ background: "#ffffff", padding: "16px", borderRadius: "50%", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: "14px", border: "1px solid #e2e8f0" }}>
              <img src="/circle_crop_logo.png" alt="Multimarg Carriers Logo" style={{ width: "52px", height: "52px", objectFit: "contain", display: "block", borderRadius: "50%" }} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" }}>Select an email to view</h3>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0, textAlign: "center", maxWidth: "280px" }}>
              MULTIMARG CARRIERS PRIVATE LIMITED &bull; Enterprise Corporate Mailbox
            </p>
          </div>
        )}

      </div>

      {/* MOBILE FLOATING COMPOSE BUTTON (FAB) */}
      {isMobile && activeAccount && (
        <button
          onClick={() => {
            setComposeData({ to: "", cc: "", bcc: "", subject: "", body: "", attachments: [], inReplyTo: "", references: "" });
            setIsComposeOpen(true);
            setIsComposeMinimized(false);
          }}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99,
            cursor: "pointer"
          }}
          title="Compose Email"
        >
          <Plus size={26} color="#ffffff" />
        </button>
      )}

      {/* 3. MULTIMARG MOBILE ACCOUNT SWITCHER DIALOG / SHEET */}
      <AnimatePresence>
        {isMobileAccountModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(3px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
            onClick={() => setIsMobileAccountModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: "100%",
                maxWidth: "360px",
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                display: "flex",
                flexDirection: "column"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Logo */}
              <div style={{ padding: "16px 20px 10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img src="/circle_crop_logo.png" alt="Logo" style={{ width: "26px", height: "26px", borderRadius: "50%" }} />
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>Multimarg Mailbox</span>
                </div>
                <button onClick={() => setIsMobileAccountModalOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                  <X size={18} />
                </button>
              </div>

              {/* Active Account Card */}
              {activeAccount && (
                <div style={{ margin: "0 16px 14px 16px", padding: "12px 14px", backgroundColor: "#eff6ff", borderRadius: "14px", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800" }}>
                    {(activeAccount.displayName || activeAccount.email).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {activeAccount.displayName || "Business Account"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#1d4ed8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {activeAccount.email}
                    </div>
                  </div>
                  <CheckCircle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                </div>
              )}

              {/* Other Connected Accounts List */}
              {accounts.filter(a => a.id !== selectedAccountId).length > 0 && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "10px 16px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", marginBottom: "6px" }}>Switch Account</div>
                  {accounts.filter(a => a.id !== selectedAccountId).map(acc => (
                    <div
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setIsMobileAccountModalOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        backgroundColor: "#f8fafc",
                        marginBottom: "6px"
                      }}
                    >
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#e2e8f0", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700" }}>
                        {(acc.displayName || acc.email).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {acc.displayName || acc.email.split("@")[0]}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {acc.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions: Add Account & Disconnect */}
              <div style={{ borderTop: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {(isSuperAdmin || accounts.length === 0) && (
                  <button
                    onClick={() => {
                      setIsMobileAccountModalOpen(false);
                      setConnectForm(prev => ({ ...prev, email: isSuperAdmin ? "" : user?.email || "" }));
                      setIsConnectModalOpen(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer"
                    }}
                  >
                    <UserPlus size={16} /> <span>Add another business account</span>
                  </button>
                )}

                {activeAccount && isSuperAdmin && (
                  <button
                    onClick={() => handleDisconnectAccount(activeAccount.id, activeAccount.email)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "1px solid #fee2e2",
                      backgroundColor: "#fef2f2",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer"
                    }}
                  >
                    <LogOut size={16} /> <span>Disconnect this mailbox</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE SIDEBAR DRAWER (Slide Over) */}
      <AnimatePresence>
        {isMobile && isSidebarDrawerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(3px)",
              zIndex: 99999,
              display: "flex"
            }}
            onClick={() => setIsSidebarDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                width: "260px",
                backgroundColor: "#ffffff",
                height: "100%",
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "4px 0 20px rgba(0,0,0,0.15)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <img src="/circle_crop_logo.png" alt="Logo" style={{ width: "26px", height: "26px", borderRadius: "50%" }} />
                    <span style={{ fontSize: "14.5px", fontWeight: "800", color: "#0f172a" }}>Multimarg Folders</span>
                  </div>
                  <button onClick={() => setIsSidebarDrawerOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[
                    { key: "INBOX", name: "Inbox", icon: <Inbox size={16} />, role: "inbox" },
                    { key: "STARRED", name: "Starred", icon: <Star size={16} />, role: "starred" },
                    { key: "SENT", name: "Sent", icon: <Send size={16} />, role: "sent" },
                    { key: "DRAFTS", name: "Drafts", icon: <FileText size={16} />, role: "drafts" },
                    { key: "TRASH", name: "Trash", icon: <Trash2 size={16} />, role: "trash" },
                    { key: "SPAM", name: "Spam", icon: <AlertOctagon size={16} />, role: "spam" }
                  ].map(fMeta => {
                    const isSelected = currentFolder.toUpperCase() === fMeta.key;
                    return (
                      <button
                        key={fMeta.key}
                        onClick={() => {
                          if (fMeta.key === "STARRED") {
                            setActiveFilter("flagged");
                          } else {
                            setActiveFilter("all");
                            setCurrentFolder(fMeta.key);
                          }
                          setIsSidebarDrawerOpen(false);
                          setMobileView("list");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: isSelected ? "#eff6ff" : "transparent",
                          color: isSelected ? "#1d4ed8" : "#475569",
                          fontWeight: isSelected ? "700" : "500",
                          fontSize: "13.5px",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                      >
                        <span style={{ color: isSelected ? "#2563eb" : "#64748b" }}>{fMeta.icon}</span>
                        <span>{fMeta.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Connected: {activeAccount?.email}</div>
                <button
                  onClick={() => {
                    fetchFolders();
                    fetchMessages(true);
                    setIsSidebarDrawerOpen(false);
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "12px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <RefreshCw size={13} /> Sync Mailbox
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. GMAIL-STYLE DOCKABLE BOTTOM-RIGHT COMPOSER WINDOW */}
      <AnimatePresence>
        {isComposeOpen && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            style={{
              position: "fixed",
              bottom: 0,
              right: isMobile ? 0 : "24px",
              width: isMobile ? "100vw" : isComposeExpanded ? "800px" : "560px",
              height: isComposeMinimized ? "46px" : isMobile ? "100vh" : isComposeExpanded ? "80vh" : "520px",
              backgroundColor: "#ffffff",
              borderRadius: isMobile ? "0px" : "12px 12px 0 0",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
              border: "1px solid #cbd5e1",
              borderBottom: "none",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Header Toolbar (Minimize, Maximize, Close) */}
            <div
              style={{
                backgroundColor: "#f1f5f9",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e2e8f0",
                cursor: "pointer"
              }}
              onClick={() => setIsComposeMinimized(!isComposeMinimized)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: "700", fontSize: "13.5px", color: "#0f172a" }}>
                  {composeData.subject ? composeData.subject : "New Message"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsComposeMinimized(!isComposeMinimized)}
                  title="Minimize"
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px", display: "flex" }}
                >
                  <Minus size={15} />
                </button>

                {!isMobile && (
                  <button
                    type="button"
                    onClick={() => setIsComposeExpanded(!isComposeExpanded)}
                    title={isComposeExpanded ? "Collapse" : "Full Screen"}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px", display: "flex" }}
                  >
                    {isComposeExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  title="Close"
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px", display: "flex" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Compose Form (Visible when not minimized) */}
            {!isComposeMinimized && (
              <form onSubmit={handleSendEmail} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", padding: "14px 18px" }}>
                
                {/* Sender Account (From Selector) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "7px", marginBottom: "7px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", minWidth: "42px" }}>From</span>
                  {accounts.length > 1 ? (
                    <select
                      value={composeData.fromAccountId || selectedAccountId || ""}
                      onChange={(e) => setComposeData({ ...composeData, fromAccountId: e.target.value })}
                      style={{
                        flex: 1,
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        color: "#0f172a",
                        backgroundColor: "#f8fafc",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
                      {activeAccount?.email}
                    </span>
                  )}
                </div>

                {/* Recipients (To) - Supports comma separated multiple emails */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "7px", marginBottom: "7px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", width: "38px" }}>To</span>
                  <input
                    type="text"
                    required
                    placeholder="Recipients (separate multiple with commas)"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    style={{ flex: 1, border: "none", outline: "none", fontSize: "13.5px" }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() => setShowCc(true)}
                        style={{ fontSize: "11.5px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}
                      >
                        Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() => setShowBcc(true)}
                        style={{ fontSize: "11.5px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}
                      >
                        Bcc
                      </button>
                    )}
                  </div>
                </div>

                {/* CC Field - Supports comma separated multiple emails */}
                {showCc && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "7px", marginBottom: "7px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", width: "38px" }}>Cc</span>
                    <input
                      type="text"
                      placeholder="Carbon copy recipients (separated by commas)"
                      value={composeData.cc}
                      onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                      style={{ flex: 1, border: "none", outline: "none", fontSize: "13px" }}
                    />
                  </div>
                )}

                {/* BCC Field - Supports comma separated multiple emails */}
                {showBcc && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "7px", marginBottom: "7px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", width: "38px" }}>Bcc</span>
                    <input
                      type="text"
                      placeholder="Blind carbon copy recipients (separated by commas)"
                      value={composeData.bcc}
                      onChange={(e) => setComposeData({ ...composeData, bcc: e.target.value })}
                      style={{ flex: 1, border: "none", outline: "none", fontSize: "13px" }}
                    />
                  </div>
                )}

                {/* Subject */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "7px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    required
                    placeholder="Subject"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    style={{ width: "100%", border: "none", outline: "none", fontSize: "14px", fontWeight: "600", color: "#0f172a" }}
                  />
                </div>

                {/* Message Body */}
                <textarea
                  rows={isComposeExpanded ? 12 : 7}
                  required
                  placeholder="Write your email here..."
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  style={{
                    width: "100%",
                    border: "none",
                    fontSize: "13.5px",
                    lineHeight: "1.6",
                    outline: "none",
                    resize: "none",
                    marginBottom: "10px"
                  }}
                />

                {/* Optional Sender Name, Designation & Phone Row */}
                <div style={{ marginBottom: "10px", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showCustomSigner ? "8px" : 0 }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>
                      Signature Info (Auto-filled from IAM Profile)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomSigner(!showCustomSigner)}
                      style={{ fontSize: "11px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}
                    >
                      {showCustomSigner ? "Hide Details" : "+ Edit Name, Designation & Phone"}
                    </button>
                  </div>
                  {showCustomSigner && (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Your Name (e.g. Akash Debnath)"
                        value={composeData.senderName || ""}
                        onChange={(e) => updateSenderInfo("senderName", e.target.value)}
                        style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", backgroundColor: "#ffffff" }}
                      />
                      <input
                        type="text"
                        placeholder="Designation (e.g. Accounts & IT Head)"
                        value={composeData.senderDesignation || ""}
                        onChange={(e) => updateSenderInfo("senderDesignation", e.target.value)}
                        style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", backgroundColor: "#ffffff" }}
                      />
                      <input
                        type="tel"
                        placeholder="Direct Phone (e.g. +91 98765 43210)"
                        value={composeData.senderPhone || ""}
                        onChange={(e) => updateSenderInfo("senderPhone", e.target.value)}
                        style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", backgroundColor: "#ffffff" }}
                      />
                    </div>
                  )}
                </div>

                {/* Official Signature Badge */}
                <div style={{ padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "3px solid #2563eb", marginBottom: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src="/circle_crop_logo.png"
                    alt="Multimarg Logo"
                    style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "contain", background: "#ffffff", padding: "1px", border: "1px solid #e2e8f0" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>
                      {composeData.senderName || (activeAccount?.displayName?.toLowerCase() === "accounts" ? "Accounts" : activeAccount?.displayName) || (activeAccount?.email ? (activeAccount.email.split("@")[0].toLowerCase() === "accounts" ? "Accounts" : activeAccount.email.split("@")[0].toUpperCase()) : "Multimarg Team")}
                    </div>
                    {composeData.senderDesignation && (
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>
                        {composeData.senderDesignation}
                      </div>
                    )}
                    <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#2563eb" }}>
                      MULTIMARG CARRIERS PRIVATE LIMITED
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                      <span>Landline: <strong style={{ color: "#0f172a" }}>+91 5944-324033</strong></span>
                      {composeData.senderPhone && (
                        <span> &bull; Direct: <strong style={{ color: "#0f172a" }}>{composeData.senderPhone}</strong></span>
                      )}
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>
                      <span>{activeAccount?.email}</span> &bull; 
                      <span style={{ color: "#2563eb", fontWeight: "600", marginLeft: "3px" }}>multimarg.com</span>
                    </div>
                  </div>
                  <span style={{ fontSize: "9.5px", fontWeight: "800", color: "#15803d", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: "10px" }}>
                    OFFICIAL
                  </span>
                </div>

                {/* Attachment Chips */}
                {(composeData.attachments || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {composeData.attachments.map((file, i) => (
                      <span
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "3px 8px",
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "500",
                          border: "1px solid #bfdbfe"
                        }}
                      >
                        {file.name}
                        <X
                          size={12}
                          style={{ cursor: "pointer" }}
                          onClick={() => setComposeData(prev => ({ ...prev, attachments: prev.attachments.filter((_, idx) => idx !== i) }))}
                        />
                      </span>
                    ))}
                  </div>
                )}

                {/* Gmail-Style Bottom Formatting Bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="submit"
                      disabled={sendingMail}
                      style={{
                        padding: "8px 20px",
                        borderRadius: "20px",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        border: "none",
                        fontSize: "13.5px",
                        fontWeight: "700",
                        cursor: sendingMail ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                        opacity: sendingMail ? 0.7 : 1
                      }}
                    >
                      {sendingMail ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>{sendingMail ? "Sending..." : "Send"}</span>
                    </button>

                    <label
                      htmlFor="floating-composer-attachments"
                      style={{
                        padding: "6px",
                        borderRadius: "6px",
                        color: "#64748b",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                      title="Attach Files"
                    >
                      <Paperclip size={18} />
                    </label>
                    <input
                      type="file"
                      id="floating-composer-attachments"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setComposeData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    title="Discard Draft"
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "6px", display: "flex" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. CONNECT HOSTINGER MAILBOX MODAL */}
      <AnimatePresence>
        {isConnectModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: "100%",
                maxWidth: "500px",
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ backgroundColor: "#ffffff", color: "#0f172a", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ background: "#eff6ff", color: "#2563eb", padding: "7px", borderRadius: "8px", display: "flex" }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>Connect Business Mailbox</h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>Hostinger IMAP &amp; SMTP Authentication</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConnectModalOpen(false)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", padding: "4px" }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConnectAccount} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px 10px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px" }}>
                  <CheckCircle size={15} style={{ color: "#16a34a", flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ fontSize: "11.5px", color: "#15803d" }}>
                    {isSuperAdmin
                      ? "Super Admin Workspace: Connect up to 5-6 corporate mailboxes and switch tabs effortlessly."
                      : `IAM Policy: Fixed to your registered business email (${user?.email}). Password encrypted with AES-256.`}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                    Email ID <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!isSuperAdmin && Boolean(user?.email)}
                    placeholder="e.g. accounts@multimarg.com"
                    value={connectForm.email}
                    onChange={(e) => setConnectForm({ ...connectForm, email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      backgroundColor: (!isSuperAdmin && Boolean(user?.email)) ? "#f8fafc" : "#ffffff",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                    Email Password <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter Hostinger email password"
                    value={connectForm.password}
                    onChange={(e) => setConnectForm({ ...connectForm, password: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Multi Marg Accounts"
                    value={connectForm.displayName}
                    onChange={(e) => setConnectForm({ ...connectForm, displayName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11.5px", fontWeight: "600", cursor: "pointer", padding: 0 }}
                  >
                    {showAdvancedSettings ? "- Hide Server Ports" : "+ Advanced IMAP / SMTP Hostinger Defaults"}
                  </button>

                  {showAdvancedSettings && (
                    <div style={{ marginTop: "8px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>IMAP Host</label>
                        <input
                          type="text"
                          value={connectForm.imapHost}
                          onChange={(e) => setConnectForm({ ...connectForm, imapHost: e.target.value })}
                          style={{ width: "100%", padding: "5px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>IMAP Port</label>
                        <input
                          type="number"
                          value={connectForm.imapPort}
                          onChange={(e) => setConnectForm({ ...connectForm, imapPort: e.target.value })}
                          style={{ width: "100%", padding: "5px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>SMTP Host</label>
                        <input
                          type="text"
                          value={connectForm.smtpHost}
                          onChange={(e) => setConnectForm({ ...connectForm, smtpHost: e.target.value })}
                          style={{ width: "100%", padding: "5px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b" }}>SMTP Port</label>
                        <input
                          type="number"
                          value={connectForm.smtpPort}
                          onChange={(e) => setConnectForm({ ...connectForm, smtpPort: e.target.value })}
                          style={{ width: "100%", padding: "5px", fontSize: "11.5px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setIsConnectModalOpen(false)}
                    style={{ padding: "7px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "12.5px", fontWeight: "600", color: "#64748b", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connecting}
                    style={{
                      padding: "7px 18px",
                      borderRadius: "6px",
                      backgroundColor: "#2563eb",
                      color: "#fff",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      cursor: connecting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: connecting ? 0.7 : 1
                    }}
                  >
                    {connecting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    <span>{connecting ? "Verifying..." : "Connect Mailbox"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Webmail;
