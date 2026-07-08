<?php
// secure-upload.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

include('config.php'); // $con
$uploadDir = realpath('upload-vouchers');
if ($uploadDir === false) {
    die("<script>alert('Upload directory missing on server.'); window.location='cashsheet.php';</script>");
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die("<script>alert('Invalid request method.'); window.location='cashsheet.php';</script>");
}

// sanitize inputs
$amount = isset($_POST['amount']) ? trim($_POST['amount']) : '';
$date = isset($_POST['date']) ? trim($_POST['date']) : '';
$remarks = isset($_POST['remarks']) ? trim($_POST['remarks']) : '';
$cash = isset($_POST['cash']) ? trim($_POST['cash']) : '';

if (!isset($_FILES['voucher'])) {
    die("<script>alert('No file uploaded.'); window.location='cashsheet.php';</script>");
}

$file = $_FILES['voucher'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    $msg = 'Upload error code: ' . $file['error'];
    die("<script>alert('File upload failed: $msg'); window.location='cashsheet.php';</script>");
}

// basic checks
$allowedTypes = ['image/jpeg','image/png','application/pdf'];
if (!in_array($file['type'], $allowedTypes)) {
    die("<script>alert('Only JPG, PNG or PDF allowed.'); window.location='cashsheet.php';</script>");
}

// optional: size limit (e.g., 5MB)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    die("<script>alert('File too large. Max 5MB.'); window.location='cashsheet.php';</script>");
}

// create unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$unique = time() . '_' . bin2hex(random_bytes(6)) . '.' . $extension;
$targetPath = $uploadDir . DIRECTORY_SEPARATOR . $unique;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    die("<script>alert('Failed to move uploaded file. Check permissions.'); window.location='cashsheet.php';</script>");
}

// Insert using prepared statement
$stmt = mysqli_prepare($con, "INSERT INTO cash (pid, amount, date, in_out, remarks, voucher ) VALUES (?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    $err = mysqli_error($con);
    die("<script>alert('DB prepare failed: $err'); window.location='cashsheet.php';</script>");
}
$pid = 0;
mysqli_stmt_bind_param($stmt, 'isssss', $pid, $amount, $date, $cash, $remarks, $unique);
$exec = mysqli_stmt_execute($stmt);
if ($exec) {
    echo "<script>alert('Uploaded and saved successfully.'); window.location='cashsheet.php';</script>";
} else {
    $err = mysqli_stmt_error($stmt);
    // remove uploaded file if DB fails
    @unlink($targetPath);
    die("<script>alert('DB insert failed: $err'); window.location='cashsheet.php';</script>");
}
?>
