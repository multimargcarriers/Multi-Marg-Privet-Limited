<?php session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}
include ('config.php');
$uploadDir = 'upload-pod/';  // Make sure this folder exists and is writable

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['pod'])) {
    $file = $_FILES['pod'];
$awb=$_POST["awb"];
    // Get file details
    $fileName = basename($file['name']);
    $targetPath = $uploadDir . $fileName;

    // Validate file type (optional but recommended)
    $allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!in_array($file['type'], $allowedTypes)) {
        echo "Error: Only JPG, PNG, and PDF files are allowed.";
        exit;
    }

    // Move uploaded file to the target folder
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
         $insert_query = "INSERT INTO pod (pid, awb,pod_name) VALUES (0, '$awb', '$fileName')";
                $insert_result = mysqli_query($con, $insert_query);

                if ($insert_result) {
        echo "<script type='text/javascript'>alert('File uploaded successfully.'); window.location = 'pod.php';</script> ";
        
                }
    } else {
        echo "<script type='text/javascript'>alert('Error uploading file.'); window.location = 'pod.php';</script>";
    }
} else {
    echo "<script type='text/javascript'>alert('No file uploaded.'); window.location = 'pod.php';</script>";
}
?>