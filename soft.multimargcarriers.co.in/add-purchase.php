<?php
// secure-upload.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

include('config.php'); // $con
$uploadDir = realpath('upload-purchase');
if ($uploadDir === false) {
    die("<script>alert('Upload directory missing on server.'); window.location='purchase.php';</script>");
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die("<script>alert('Invalid request method.'); window.location='purchase.php';</script>");
}

// sanitize inputs
$vendor = isset($_POST['vendor']) ? trim($_POST['vendor']) : '';
$bill = isset($_POST['bill']) ? trim($_POST['bill']) : '';
$date = isset($_POST['date']) ? trim($_POST['date']) : '';
$subtotal = isset($_POST['taxable']) ? trim($_POST['taxable']) : '';
$gst = isset($_POST['gst']) ? trim($_POST['gst']) : '';
$total = isset($_POST['total']) ? trim($_POST['total']) : '';

$unique ="";   // default (no file)

// --------------------------------
// HANDLE FILE ONLY IF USER CHOOSES
// --------------------------------
if (isset($_FILES['billupload']) && $_FILES['billupload']['error'] != UPLOAD_ERR_NO_FILE) {

    $file = $_FILES['billupload'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $msg = 'Upload error code: ' . $file['error'];
        die("<script>alert('File upload failed: $msg'); window.location='purchase.php';</script>");
    }

    // Allowed types
    $allowedTypes = ['image/jpeg','image/png','application/pdf'];
    if (!in_array($file['type'], $allowedTypes)) {
        die("<script>alert('Only JPG, PNG or PDF allowed.'); window.location='purchase.php';</script>");
    }

    // Size limit 5MB
    if ($file['size'] > 5 * 1024 * 1024) {
        die("<script>alert('File too large. Max 5MB.'); window.location='purchase.php';</script>");
    }

    // Unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $unique = time() . '_' . bin2hex(random_bytes(6)) . '.' . $extension;

    $targetPath = $uploadDir . '/' . $unique;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        die("<script>alert('Failed to move uploaded file.'); window.location='purchase.php';</script>");
    }
}

// --------------------------------
// INSERT DATA (WITH OR WITHOUT FILE)
// --------------------------------

$stmt = mysqli_prepare(
    $con,
    "INSERT INTO purchase
    (vendor, bill, date, subtotal, gst, total, bill_upload)
    VALUES (?, ?, ?, ?, ?, ?, ?)"
);

if (!$stmt) {
    die("<script>alert('DB prepare failed: ".mysqli_error($con)."');</script>");
}

mysqli_stmt_bind_param(
    $stmt,
    "sssddds",
    $vendor,
    $bill,
    $date,
    $subtotal,
    $gst,
    $total,
    $unique   // NULL if no file uploaded
);

$exec = mysqli_stmt_execute($stmt);

if ($exec) {
    echo "<script>alert('Saved successfully.'); window.location='purchase.php';</script>";
} else {
    // delete uploaded file if DB insert fails
    if ($unique != NULL) {
        @unlink($targetPath);
    }
    die("<script>alert('DB insert failed.'); window.location='purchase.php';</script>");
}

?>
