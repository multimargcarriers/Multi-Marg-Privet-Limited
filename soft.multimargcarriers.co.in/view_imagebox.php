<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['filename'])) {

    $filename = basename($_POST['filename']); // ✅ secure

    $filePath = __DIR__ . "/upload-box/" . $filename;
    $urlPath  = "upload-box/" . $filename;

    // DEBUG (remove later)
    // echo $filePath;

    if (file_exists($filePath)) {

        echo "<img src='$urlPath' style='max-width:100%; height:auto;'>";

    } else {
        echo "❌ Image not found: " . htmlspecialchars($filename);
    }

} else {
    echo "❌ Invalid request or filename missing";
}
?>