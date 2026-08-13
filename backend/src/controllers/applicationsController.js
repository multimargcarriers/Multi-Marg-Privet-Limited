const { db } = require("../config/database");
const { uploadStream } = require("../config/cloudinary");

/**
 * Submit a new job application
 * @route POST /api/public/applications
 */
const submitApplication = async (req, res) => {
  try {
    const { name, email, phone, coverLetter, jobId, jobTitle } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required",
      });
    }

    let resumeUrl = null;
    if (req.file) {
      // Memory storage is used, so file is in req.file.buffer
      const uploadResult = await uploadStream(req.file.buffer, { 
        folder: "applications",
        originalName: req.file.originalname 
      });
      
      if (uploadResult.success) {
        resumeUrl = uploadResult.url;
      } else {
        console.error("[Applications] Cloudinary stream upload failed:", uploadResult.message);
      }
    }

    const applicationRef = await db.collection("applications").add({
      name,
      email,
      phone,
      coverLetter: coverLetter || "",
      jobId: jobId || null,
      jobTitle: jobTitle || "General Application",
      resumeUrl,
      status: "New", // New, Reviewed, Interview, Rejected, Hired
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: { id: applicationRef.id },
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting application",
      error: error.message,
    });
  }
};

/**
 * Get all applications (Admin)
 * @route GET /api/applications
 */
const getAllApplications = async (req, res) => {
  try {
    const snapshot = await db.collection("applications")
      .orderBy("createdAt", "desc")
      .get();
      
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
};

/**
 * Update application status (Admin)
 * @route PUT /api/applications/:id
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    await db.collection("applications").doc(id).update({
      status,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating application status",
      error: error.message,
    });
  }
};

/**
 * Delete an application (Admin)
 * @route DELETE /api/applications/:id
 */
const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: we could delete the resume file from disk here if needed.
    // For now we just remove the DB record.
    await db.collection("applications").doc(id).delete();

    res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting application:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting application",
      error: error.message,
    });
  }
};

/**
 * Download a resume from MongoDB base64 storage
 */
const downloadResume = async (req, res) => {
  try {
    const { id } = req.params;
    const resumeDoc = await db.collection("resumes").doc(id).get();
    
    if (!resumeDoc.exists) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    const data = resumeDoc.data();
    const buffer = Buffer.from(data.data, "base64");
    
    res.setHeader("Content-Type", data.contentType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${data.originalName || "resume.pdf"}"`);
    res.send(buffer);
  } catch (error) {
    console.error("[Applications] Download error:", error);
    res.status(500).json({ success: false, message: "Error downloading resume" });
  }
};

module.exports = {
  submitApplication,
  getAllApplications,
  updateApplicationStatus,
  deleteApplication,
  downloadResume,
};
