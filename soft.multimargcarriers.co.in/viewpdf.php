<?php
  
// Store the file name into variable
 $file = $_GET["filename"];
    $filename = $_GET["filename"];
  echo $filename;
// Header content type
header('Content-type: application/pdf');
  
header('Content-Disposition: inline; filename="' . $filename . '"');
  
header('Content-Transfer-Encoding: binary');
  
header('Accept-Ranges: bytes');
  
// Read the file
@readfile($file);
  
?>