<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $filename = basename($_POST['filename']); 
    $extension = pathinfo($filename, PATHINFO_EXTENSION);// sanitize
    $filepath = "upload-vouchers/" . $filename;
    
if ($extension=="pdf")
{
    header('Content-type: application/pdf');
  
header('Content-Disposition: inline; filename="' . $filename . '"');
  
header('Content-Transfer-Encoding: binary');
  
header('Accept-Ranges: bytes');
  
// Read the file
@readfile($filepath);
}
else
{
    if (file_exists($filepath)) {
        // Convert file system path to URL path
        $urlPath = "upload-vouchers/" . $filename;
        echo "<img src='$urlPath' alt='Image' style='max-width:1000%;'>";
    } else {
        echo "Image not found.";
    }
}} else {
    echo "Invalid request.";
}

?>
