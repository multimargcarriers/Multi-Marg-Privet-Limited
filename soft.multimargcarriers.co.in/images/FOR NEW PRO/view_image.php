<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $filename = basename($_POST['filename']); // sanitize
    $filepath = "upload-pod/" . $filename;

    if (file_exists($filepath)) {
        // Convert file system path to URL path
        $urlPath = "upload-pod/" . $filename;
        echo "<img src='$urlPath' alt='Image' style='max-width:1000%;'>";
    } else {
        echo "Image not found.";
    }
} else {
    echo "Invalid request.";
}
?>
