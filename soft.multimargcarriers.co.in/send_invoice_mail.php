<?php
include('config.php');

require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';
require 'PHPMailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;

if ($_SERVER['REQUEST_METHOD'] == 'POST') {

  if (!isset($_FILES['pdf'])) {
    die("❌ No PDF received");
}

$invoiceNo = $_POST['invoice_no'];

    // =========================
    // DECODE PDF
    // =========================
   $folder = "temp/";
if (!is_dir($folder)) {
    mkdir($folder, 0777, true);
}

// 🔥 MAKE SAFE FILE NAME (IMPORTANT)
$safeInvoiceNo = preg_replace('/[^A-Za-z0-9]/', '_', $invoiceNo);
$filePath = $folder . "invoice_" . $safeInvoiceNo . ".pdf";

// SAVE FILE DIRECTLY (NO DECODE = NO CORRUPTION)
move_uploaded_file($_FILES['pdf']['tmp_name'], $filePath);

// VERIFY PDF
if (filesize($filePath) < 1000) {
    unlink($filePath);
    die("❌ PDF corrupted or empty");
}

    // =========================
    // GET CLIENT EMAIL
    // =========================
 $q = mysqli_query($con, "
    SELECT c.email 
    FROM bills b
    LEFT JOIN client c ON LOWER(c.client) = LOWER(b.client)
    WHERE b.invoice = '$invoiceNo'
    LIMIT 1
");
    $row = mysqli_fetch_assoc($q);
    $toEmail = $row['email'];

    // =========================
    // SEND MAIL
    // =========================
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
     $mail->Host       = 'mail.multimargcarriers.co.in';
$mail->SMTPAuth   = true;
        $mail->Username = 'info@multimargcarriers.co.in';
        $mail->Password = 'Multi@marg@123'; // ⚠️ use app password
       $mail->SMTPSecure = 'ssl';
$mail->Port       = 465;

       $mail->setFrom('info@multimargcarriers.co.in', 'Multimarg Carriers - Billing Dept');
        $emails = explode(',', $toEmail);

foreach ($emails as $email) {
    $email = trim($email);

    if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $mail->addAddress($email);
    }
}

        $mail->Subject = "Multimarg Carriers Invoice #" . $invoiceNo;
        $mail->isHTML(true);
        $mail->Body = "<p>Dear Customer,</p>

<p>Please find attached <strong>Invoice " . $invoiceNo . "</strong> for your reference.</p>

<p>If you have any questions, feel free to contact us.</p>

<p>Thank you for your business.</p>

<p>Regards,</p>

<table style='border-collapse:collapse; font-family:Arial, sans-serif; margin-top:10px;'>
<tr>
    <td style='background:#2d2a35; padding:20px; text-align:center;'>
    <span style='
        color:#00aaff; /* fallback */
        font-weight:bold;
        font-size:12px;
       
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        display:inline-block;
    '>
        MULTIMARG CARRIERS PVT. LTD.
    </span>
</td>

    

    <td style='background:#f5f5f5; padding:15px 20px;'>
        <h3 style='margin:0; color:#333;'>Akash Debnath</h3>
        <p style='margin:2px 0; color:#777;'>Billing Head</p>

        <hr style='border:0; border-top:1px solid #ccc; margin:8px 0;'>

        <p style='margin:4px 0;'>📞 +91-7209877637</p>
        <p style='margin:4px 0;'>🌐 www.multimargcarriers.co.in</p>
        <p style='margin:4px 0;'>📍 Rudrapur - 263153</p>
    </td>

    <td style='background:#e5b63b; width:15px;'></td>
</tr>
</table>";

        $mail->addAttachment($filePath);

        $mail->send();

        unlink($filePath); // delete file

        echo "✅ Email Sent Successfully";

    } catch (Exception $e) {
        echo "❌ Mail Error: " . $mail->ErrorInfo;
    }
}
?>