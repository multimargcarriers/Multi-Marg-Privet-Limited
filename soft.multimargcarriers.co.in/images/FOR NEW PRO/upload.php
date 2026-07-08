<?php session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}
include('config.php');
// Check if a file has been uploaded
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $prefix=$_POST['prefix'];
    $invoice=$_POST['invoice_no'];
$date=$_POST['invoice_date'];
$mode=$_POST['mode'];
$client=$_POST['client'];
$origin=$_POST['origin'];
$destination=$_POST['destination'];
$frieght=$_POST['frieght'];
$awb_charge=$_POST['awb_charge'];
$other_charge=$_POST['others'];
$gst=$_POST['gst'];
$invoice_no=$prefix.$invoice;
    if (isset($_FILES['pdffile']) && $_FILES['pdffile']['error'] == 0) {
        
        $fileTmpPath = $_FILES['pdffile']['tmp_name'];
        $fileName = $_FILES['pdffile']['name'];
        $fileSize = $_FILES['pdffile']['size'];
        $fileType = $_FILES['pdffile']['type'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        // Allowed file extensions
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt'];

        if (in_array($fileExtension, $allowedExtensions)) {
            // Set destination path
            $uploadFileDir = 'upload/';
            $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
            $destPath = $uploadFileDir . $newFileName;

            // Move the file
            if (move_uploaded_file($fileTmpPath, $destPath)) {
                 $insert_query = "INSERT INTO bills (pid, invoice, invoice_date, client, origin,destination,awb,mode, awb_date,box,weight,rate, frieght, awb_charge,pickup, delivery,special_delivery,other_charge,gst) VALUES (0, '$invoice_no', '$date', '$client', '$origin', '$destination', 'NA','$mode', 'NA', 'NA', 'NA', 'NA', '$frieght', '$awb_charge', '0', '0', '0', '$other_charge','$gst')";
                $insert_result = mysqli_query($con, $insert_query);

                if ($insert_result) {
                     $insert = "INSERT INTO miscellaneous (pid, invoice, invoice_date, file_name,gst) VALUES (0, '$invoice_no', '$date', '$newFileName','$gst')";
                $result = mysqli_query($con, $insert);
                if ($result) {
                    echo "<script type='text/javascript'>alert('Data saved successfully.'); window.location = 'miscellaneous-bill.php';</script>";
                }
                else {
                    echo "<script type='text/javascript'>alert('Failed to save data.'); window.location = 'miscellaneous-bill.php';</script>";
                }
            }
             else {
                    echo "<script type='text/javascript'>alert('Failed to save data.'); window.location = 'miscellaneous-bill.php';</script>";
                }
               
            } else {
                echo "<script type='text/javascript'>alert('There was an error moving the uploaded file.'); window.location = 'miscellaneous-bill.php';</script>";
            }
        } else {
            echo "<script type='text/javascript'>alert('Upload failed. Allowed file types: ' ". implode(", ", $allowedExtensions)."); window.location = 'miscellaneous-bill.php';</script>";
        }

    } else {
        echo "<script type='text/javascript'>alert('No file uploaded or upload error.'); window.location = 'miscellaneous-bill.php';</script>";
    }
} else {
    echo "<script type='text/javascript'>alert('Invalid request.'); window.location = 'miscellaneous-bill.php';</script>";
}
?>