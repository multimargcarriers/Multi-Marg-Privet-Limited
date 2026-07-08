<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

include('config.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['box_file'])) {

    $awb = mysqli_real_escape_string($con, $_POST['awb']);

    $uploadDir = "upload-box/";

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileTmp  = $_FILES['box_file']['tmp_name'];
    $fileName = $_FILES['box_file']['name'];

    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','webp'];

    if (!in_array($ext, $allowed)) {
        die("Invalid file type");
    }

    $newFileName = "BOX_" . $awb . "_" . time() . "." . $ext;
    $target = $uploadDir . $newFileName;

    if (move_uploaded_file($fileTmp, $target)) {

        $check = mysqli_query($con, "SELECT pid FROM box WHERE awb='$awb'");

        if (mysqli_num_rows($check) > 0) {
            mysqli_query($con, "UPDATE box SET box='$newFileName' WHERE awb='$awb'");
        } else {
            mysqli_query($con, "INSERT INTO box (awb, box) VALUES ('$awb','$newFileName')");
        }

        echo "<script>alert('Uploaded'); window.history.back();</script>";

    } else {
        echo "Upload Failed";
    }

} else {
    echo "Invalid Request";
}
?>