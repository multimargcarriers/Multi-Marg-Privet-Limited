const path = require("path");
require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const fs = require("fs");
const csv = require("csv-parser");
const { db, initMongo } = require("../config/database");
const { uploadStream } = require("../config/cloudinary");

const csvPath = path.join(__dirname, "../../../frontend/public/pod_upload.csv");
const imagesDir = path.join(__dirname, "../../../frontend/public/upload-pod");

async function run() {
  console.log("==================================================");
  console.log("[Migration Started] POD Image Upload & Sync");
  console.log(`CSV Path: ${csvPath}`);
  console.log(`Images Directory: ${imagesDir}`);
  console.log("==================================================");

  // Strip surrounding quotes from MONGODB_URI if any
  if (process.env.MONGODB_URI) {
    process.env.MONGODB_URI = process.env.MONGODB_URI.replace(/^["']|["']$/g, "").trim();
  }

  // Initialize DB
  await initMongo();

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(imagesDir)) {
    console.error(`Error: Images directory not found at ${imagesDir}`);
    process.exit(1);
  }

  // Load CSV rows
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Successfully parsed CSV. Total rows to process: ${rows.length}`);

  let successCount = 0;
  let skippedCount = 0;
  let fileNotFoundCount = 0;
  let dbNotFoundCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const awbNo = (row.awb || "").trim();
    const podName = (row.pod_name || "").trim();

    if (!awbNo || !podName) {
      console.log(`[Row ${i + 1}] Skipped: Missing AWB or POD name.`);
      skippedCount++;
      continue;
    }

    const imagePath = path.join(imagesDir, podName);
    if (!fs.existsSync(imagePath)) {
      console.log(`[Row ${i + 1}] File Not Found: '${podName}' for AWB: ${awbNo}`);
      fileNotFoundCount++;
      continue;
    }

    // Check if matching booking exists in MongoDB
    try {
      const escapedAwb = awbNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const awbRegex = new RegExp(`^${escapedAwb}$`, 'i');
      const bookingDoc = await db.mongoDb.collection("bookings").findOne({
        $or: [
          { awb: awbRegex },
          { awbNo: awbRegex },
          { lrNumber: awbRegex },
          { lrNo: awbRegex },
          { consignment: awbRegex }
        ]
      });

      if (!bookingDoc) {
        console.log(`[Row ${i + 1}] AWB Not Found in DB: ${awbNo}`);
        dbNotFoundCount++;
        continue;
      }

      const matchedBookingDocId = bookingDoc.id || bookingDoc._id.toString();

      // Read image file as buffer
      const buffer = fs.readFileSync(imagePath);

      // Upload to Cloudinary using uploadStream (preserves the local file on disk)
      const uploadResult = await uploadStream(buffer, {
        folder: "multimarg/pod",
        originalName: podName
      });

      if (!uploadResult || !uploadResult.success || !uploadResult.url) {
        console.error(`[Row ${i + 1}] Cloudinary upload failed for AWB: ${awbNo}`, uploadResult?.message);
        continue;
      }

      const podUrl = uploadResult.url;

      // Create entry in 'pod' collection
      const podEntry = {
        lrNo: awbNo,
        fileName: podName,
        podType: "VERIFIED",
        bookingId: matchedBookingDocId,
        consignor: bookingDoc.consignor || "-",
        consignee: bookingDoc.consignee || "-",
        origin: bookingDoc.origin || "-",
        destination: bookingDoc.destination || "-",
        client: bookingDoc.client || "-",
        remarks: "Auto-migrated via CSV",
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        podUrl,
        cloudinaryUrl: podUrl,
        cloudinaryPublicId: uploadResult.publicId
      };

      await db.collection("pod").add(podEntry);

      // Update Booking status to Delivered with POD URL
      await db.collection("bookings").doc(matchedBookingDocId).update({
        status: "Delivered",
        deliveryDate: new Date().toISOString(),
        podUploaded: true,
        podUrl,
        updatedAt: new Date().toISOString()
      });

      console.log(`[Row ${i + 1}] Success: AWB ${awbNo} -> Uploaded ${podName} -> Delivered`);
      successCount++;
    } catch (err) {
      console.error(`[Row ${i + 1}] Error processing AWB ${awbNo}:`, err.message);
    }
  }

  console.log("\n==================================================");
  console.log("Migration Complete Summary:");
  console.log(`- Total Processed: ${rows.length}`);
  console.log(`- Successful:      ${successCount}`);
  console.log(`- Skipped Rows:    ${skippedCount}`);
  console.log(`- File Not Found:  ${fileNotFoundCount}`);
  console.log(`- DB AWB Not Found: ${dbNotFoundCount}`);
  console.log("==================================================");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed with fatal error:", err);
  process.exit(1);
});
