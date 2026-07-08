
 <?php  
include ('config.php')?>
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tax Invoice</title>
    <link rel="shortcut icon" type="image/png" href="./favicon.png" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <style>
      * {
        box-sizing: border-box;
      }

      .table-bordered td,
      .table-bordered th {
        border: 1px solid black;
        padding: 10px;
        word-break: break-all;
      }
      
      div.c {
  text-transform: capitalize;
}

      body {
        font-family: Arial, Helvetica, sans-serif;
        margin: 0;
        padding: 0;
        font-size: 16px;
      }
      .h4-14 h4 {
        font-size: 12px;
        margin-top: 0;
        margin-bottom: 5px;
      }
      .img {
        margin-left: "auto";
        margin-top: "auto";
        height: 30px;
      }
      pre,
      p {
        /* width: 99%; */
        /* overflow: auto; */
        /* bpicklist: 1px solid #aaa; */
        padding: 0;
        margin: 0;
      }
      table {
        font-family: 'calibri', sans-serif;
        width: 100%;
        border-collapse: collapse;
        padding: 1px;
      }
     
      .hm-p p {
        text-align: left;
        padding: 1px;
        padding: 5px 4px;
      }
      td,
      th {
        
        padding: 6px 5px;
      }
      .table-b td,
      .table-b th {
        border: 1px solid black;
      }
      th {
        /* background-color: #ddd; */
      }
      .hm-p td,
      .hm-p th {
        padding: 2px 0px;
      }
      .cropped {
        float: right;
        margin-bottom: 20px;
        height: 100px; /* height of container */
        overflow: hidden;
      }
      .cropped img {
        width: 400px;
        margin: 8px 0px 0px 80px;
      }
      .main-pd-wrapper {
        box-shadow: 0 0 10px #ddd;
        background-color: #fff;
        border-radius: 10px;
        padding: 15px;
      }
      .table-bordered td,
.table-bordered th {
    border: 2px solid #000;
    padding: 10px;
    font-size: 14px;
}
      table[border="1"] {
    border: 1px solid #000;
}


      @media print {
  body * {
    visibility: hidden;
  }

  #awbContent, #awbContent * {
    visibility: visible;
  }

  #awbContent {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
.btn-group {
  text-align: right;
  margin: 15px 20px;
}

/* Base Button Style */
.custom-btn {
  border: none;
  padding: 10px 18px;
  margin-left: 10px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #fff;
}

/* Individual Colors */
.print-btn {
  background: #007bff;
}

.download-btn {
  background: #6c757d;
}

.email-btn {
  background: #28a745;
}

/* Hover Effects */
.custom-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  opacity: 0.95;
}

/* Click Effect */
.custom-btn:active {
  transform: scale(0.96);
  box-shadow: none;
}
    </style>
  </head>
  <body>
      
  <div class="btn-group">
  <button class="custom-btn print-btn" onclick="window.print()">
    🖨️ Print
  </button>

  <button class="custom-btn download-btn" id="downloadPDF">
    ⬇️ Download
  </button>

  <button class="custom-btn email-btn" onclick="sendInvoice()">
    ✉️ Send Email
  </button>
</div>

  <section class="main-pd-wrapper" id="awbContent" style="width: 1000px; margin: auto">
  <div style="display: table-header-group">
        

        <table style="width: 100%; table-layout: fixed">
          <tr>
            <td 
              style="width:10%;  vertical-align:top;"
            >
              
                 <img src="mc.png" style="max-width:300px; height: 100px;">

                
                  
            </td>
            <td style="width:90%;  vertical-align:top; font-family: Calibri, serif;">
              <center> <div style="font-size:30px; font-weight:bold; color:#003366;font-family: Georgia, serif; ">
          MULTIMARG CARRIERS PVT. LTD.
        </div>
 <span style="color:#00B8D9">  ADDRESS :</span> LIG-194, NEAR NATIONAL PUBLIC SCHOOL, AVAS VIKAS, RUDRAPUR-263153, UTTARAKHAND<br>
                   
                <span style="color:#00B8D9"> CONTACT :</span>
                 
                   05944-324033
                  &nbsp   &nbsp  &nbsp
                  <span style="color:#00B8D9"> WEBSITE :</span> www.multimargcarriers.co.in
                &nbsp   &nbsp  &nbsp
                <span style="color:#00B8D9"> EMAIL :</span> info@multimargcarriers.co.in
                
                <br>
                <span style="color:#00B8D9"> GSTIN :</span> 05AANCM3054E1ZN
                &nbsp   &nbsp  &nbsp
                 <span style="color:#00B8D9"> PAN NO :</span> AANCM3054E
                &nbsp   &nbsp  &nbsp
                <span style="color:#00B8D9"> CIN :</span> U60300UR2020PTC010749
                &nbsp   &nbsp  &nbsp
              
</td>
          </tr>
        </table>
        </div>
        <h4 style="text-align: center; margin: 0">
          <b>Tax Invoice</b>
        </h4>
      </div>
      <?php
include('config.php');

$inv = $_GET['code'] ?? '';
$sign = $_GET['sign'] ?? '';
if (!$inv) die("Invalid Invoice");
$q1 = mysqli_prepare($con, "SELECT invoice FROM bills WHERE pid = ?");
mysqli_stmt_bind_param($q1, "s", $inv);
mysqli_stmt_execute($q1);
$r1 = mysqli_stmt_get_result($q1);

$row1 = mysqli_fetch_assoc($r1);
if (!$row1) die("Invoice not found");

$invoiceNo = $row1['invoice'];
/* -------------------------
   1. FETCH BILL + CLIENT DATA (ONCE)
-------------------------- */
$sql = "
SELECT 
    b.*,
    c.address,
    c.gst
FROM bills b
LEFT JOIN client c ON UPPER(c.client) = UPPER(b.client)
WHERE b.invoice = ?
ORDER BY b.awb_date ASC
";

$stmt = mysqli_prepare($con, $sql);
mysqli_stmt_bind_param($stmt, "s", $invoiceNo);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$bills = [];
while ($row = mysqli_fetch_assoc($res)) {
    $bills[] = $row;
}

if (!$bills) die("No bill data found");

$head = $bills[0];

/* -------------------------
   2. BASIC VARIABLES
-------------------------- */
$client      = strtoupper($head['client']);
$invoiceNo   = $head['invoice'];
$invoiceDate = $head['invoice_date'];
$mode        = $head['mode'];
$gstNo       = $head['gst'];
$stateCode   = substr($gstNo, 0, 2);

$date2 = '2025-06-15';
$date3 = '2025-09-20';

/* -------------------------
   3. SUBTOTAL CALCULATION
-------------------------- */
$subtotal = 0;

foreach ($bills as $b) {
    $subtotal +=
        $b['frieght'] +
        $b['awb_charge'] +
        $b['pickup'] +
        $b['delivery'] +
        $b['special_delivery'] +
        $b['other_charge'];
}

/* -------------------------
   4. GST RATE LOGIC
-------------------------- */
if ($invoiceDate > $date3) {
    $gstRate = 0.18;
} elseif (
    $client === 'CJ DARCL LOGISTICS LIMITED' ||
    stripos($client, 'BELRISE') !== false
) {
    $gstRate = 0.18;
} else {
   $gstRate = (strtoupper($mode) === 'AIR') ? 0.18 : 0.12;
}

$gstAmount = $subtotal * $gstRate;

/* -------------------------
   5. GST SPLIT
-------------------------- */
$cgst = $sgst = $igst = 0;

if ($stateCode == '05') {
    $cgst = $gstAmount / 2;
    $sgst = $gstAmount / 2;
} else {
    $igst = $gstAmount;
}

$totalPayable = $subtotal + $gstAmount;

/* -------------------------
   6. ACCOUNT DETAILS
-------------------------- */
$bankName = "Union Bank of India, Rudrapur";
$accNo    = "510101007142176";
$ifsc     = "UBIN0816914";

if (stripos($client, 'BELRISE') !== false && $invoiceDate > $date2) {
    $bankName = "Bank of Baroda, Rudrapur";
    $accNo    = "24980400007426";
    $ifsc     = "BARB0RUDAVA";
}
?>

<!-- =========================
     HTML OUTPUT STARTS
========================= -->

<table border="1" width="100%" cellspacing="0" cellpadding="4">

<tr>
<td colspan="9">
<b>Bill To:</b><br>
<b style="font-size:20px;"><?= $client ?></b><br>
<?= strtoupper($head['address']) ?><br>
<b>GSTIN:</b> <?= $gstNo ?><br>
<b>State Code:</b> <?= $stateCode ?>
</td>

<td colspan="8">
  <table>
    <tr>
      <th style="text-align:left;">
<b>Invoice No:</b> </th><td><?= $invoiceNo ?><br></td></tr> <tr>
      <th style="text-align:left;">
<b>Date:</b></th><td> <?= date('d-m-Y', strtotime($invoiceDate)) ?><br></td></tr> <tr>
      <th style="text-align:left;">
<b>Mode:</b></th><td> <?= $mode ?><br></td></tr> <tr>
      <th style="text-align:left;">
<b>SAC Code:</b></th><td>
<?= ($mode=='AIR') ? '996531' : (($mode=='TRAIN') ? '996512' : '996511') ?></td></tr></table>

</td>
</tr>

<tr style="background:#eee;  font-weight:bold; " >
<th>Sl</th><th>LR NO</th><th>LR DT</th><th colspan="2">REF</th>
<th>ORG</th><th>DEST</th><th>PKG</th><th>WT</th>
<th>RATE</th><th>FRG</th><th>LR</th><th>PICK</th>
<th>DEL</th><th>SPL</th><th>OTH</th><th>TOTAL</th>
</tr>

<?php $i=1; foreach ($bills as $b): ?>
<tr  style="text-align:center;">
<td><?= $i++ ?></td>
<td><?= strtoupper($b['awb']) ?></td>
<td><?= date('d-m-Y', strtotime($b['awb_date'])) ?></td>
<td colspan="2">
<?php
$q = mysqli_prepare($con, "SELECT invoice FROM lr_details WHERE awb=?");
mysqli_stmt_bind_param($q, "s", $b['awb']);
mysqli_stmt_execute($q);
$r = mysqli_stmt_get_result($q);
while ($x = mysqli_fetch_assoc($r)) {
    if ($x['invoice']) echo $x['invoice']."<br>";
}
?>
</td>
<td><?= strtoupper($b['origin']) ?></td>
<td><?= strtoupper($b['destination']) ?></td>
<td><?= $b['box'] ?></td>
<td><?= $b['weight'] ?></td>
<td><?= $b['rate'] ?></td>
<td><?= $b['frieght'] ?></td>
<td><?= $b['awb_charge'] ?></td>
<td><?= $b['pickup'] ?></td>
<td><?= $b['delivery'] ?></td>
<td><?= $b['special_delivery'] ?></td>
<td><?= $b['other_charge'] ?></td>
<td>
<?= number_format(
    $b['frieght']+$b['awb_charge']+$b['pickup']+
    $b['delivery']+$b['special_delivery']+$b['other_charge'],2) ?>
</td>
</tr>
<?php endforeach; ?>

<tr>
<td colspan="9">
<b>Accounts Details</b><br>
<table>
    <tr>
      <th style="text-align:left;" ><b>
Bank: </b></th><td><?= $bankName ?></td></tr> <tr>
      <th  style="text-align:left;"><b>
A/c:</b></th><td><?= $accNo ?></td></tr>  <tr>
      <th  style="text-align:left;"><b>
IFSC: </b></th><td><?= $ifsc ?></td></tr></table>
</td>

<td colspan="8">
  <table>
    <tr><th style="text-align:left;">
<b>Subtotal:</b></th><td> ₹<?= number_format($subtotal,2) ?><br></td></tr><tr><th style="text-align:left;">
<b>CGST:</b> </th><td> ₹<?= number_format($cgst,2) ?><br></td></tr><tr><th style="text-align:left;">
<b>SGST:</b> </th><td> ₹<?= number_format($sgst,2) ?><br></td></tr><tr><th style="text-align:left;">
<b>IGST:</b> </th><td> ₹<?= number_format($igst,2) ?><br></td></tr><tr><th style="text-align:left;">
<b>Total Payable:</b></th><td>  ₹<?= number_format($totalPayable,2) ?></td></tr></table>
</td>
</tr>

</table>
<div class="c">
    <p><br><b>Amount in Words:</b> <?php $no = floor($totalPayable);
   $point = round($totalPayable - $no, 2) * 100;
   $hundred = null;
   $digits_1 = strlen($no);
   $i = 0;$pi=0;
   $str = array();
   $words = array('0' => '', '1' => 'one', '2' => 'two',
    '3' => 'three', '4' => 'four', '5' => 'five', '6' => 'six',
    '7' => 'seven', '8' => 'eight', '9' => 'nine',
    '10' => 'ten', '11' => 'eleven', '12' => 'twelve',
    '13' => 'thirteen', '14' => 'fourteen',
    '15' => 'fifteen', '16' => 'sixteen', '17' => 'seventeen',
    '18' => 'eighteen', '19' =>'nineteen', '20' => 'twenty',
    '30' => 'thirty', '40' => 'forty', '50' => 'fifty',
    '60' => 'sixty', '70' => 'seventy',
    '80' => 'eighty', '90' => 'ninety');
   $digits = array('', 'hundred', 'thousand', 'lakh', 'crore');
   while ($i < $digits_1) {
     $divider = ($i == 2) ? 10 : 100;
     $s = floor($no % $divider);
     $no = floor($no / $divider);
     $i += ($divider == 10) ? 1 : 2;
     if ($s) {
        $plural = (($counter = count($str)) && $s > 9) ? '' : null;
        $hundred = ($counter == 1 && $str[0]) ? '' : null;
        $str [] = ($s < 21) ? $words[$s] .
            " " . $digits[$counter] . $plural . " " . $hundred
            :
            $words[floor($s / 10) * 10]
            . " " . $words[$s % 10] . " "
            . $digits[$counter] . $plural . " " . $hundred;
     } else $str[] = null;
  }
  $str = array_reverse($str);
  $result = implode('', $str);
  $points = ($point) ?
     $words[$point / 10] . " " . 
          $words[$point = $point % 10] : '';
          $rt=($result);
          $pi=($points);
          
          if($point >0){echo  "Rs.  ".$rt ." & " . $pi . " Paise  Only.";}
          else{echo  "Rs.  ".$rt  . " Only." ;}
          
 ?> </p>
 </div>
<table style="width: 100%" cellspacing="0" cellspadding="0" border="0">
        <tr>
          <td>
            <h4 style="margin: 10px 0">
              Terms & Conditions
            </h4>
            <p>
              <ul>
                <li>Payment due on receipt of the bill.</li>
                <li>Payment to be made by Cheque/DD/RTGS in favour of MULTIMARG CARRIERS PVT. LTD.
only.</li>
                <li>Interest will be charged at 18% per annum if the payment not made within agreed period.</li>
</ul>
            </p>
          </td>
          <td>
            <h3 style="margin: 0; text-align: right" >
            <center> For Multimarg Carriers Pvt. Ltd.</b>
            
              
              
               <?php 
                    if($sign==1){?>
                  <div class="text-right"><img src="sign.png" alt="sign" width=150px></div>
                  <?php } else { ?>
                  <div class="text-right"><img src="download2.jpg" width="150px"  alt="Sign"></div> <?php } ?>
                 
              (Authorised Sign)<center>
            </h3>
          </td>
        </tr>
      </table>
      <br>
              <br>
              <br>
              <br>
              <center><p style="color:#003366, font-family: Georgia, serif; font: size 15px; ">Thank You!!!</p></center>
</section>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
document.getElementById("downloadPDF").addEventListener("click", function () {

    const element = document.getElementById("awbContent");

    html2pdf().from(element).set({
        filename: 'Invoice_<?php echo $invoiceNo; ?>.pdf',

        image: { type: 'jpeg', quality: 1 },

        html2canvas: {
            scale: 1.5,
            useCORS: true,
            scrollY: 0
        },

        jsPDF: {
            unit: 'px',
            format: [1100, 1300],
            orientation: 'portrait'
        },

        pagebreak: { mode: 'avoid-all' }

    }).save();
});
</script>
<!-- KEEP ONLY ONE SCRIPT -->

<script>
function sendInvoice() {

    alert("Sending Email...");

    const element = document.getElementById("awbContent");

    html2pdf().set({
        margin: 0.5, // small margin

        filename: 'invoice.pdf',

        image: { type: 'jpeg', quality: 1 },

       html2canvas: {
    scale: 1.5,
    useCORS: true,
    scrollY: 0
},

       jsPDF: {
    unit: 'px',
    format: [1100, 1300], // 🔥 SAME AS DOWNLOAD
    orientation: 'portrait'
},

        // 🔥 IMPORTANT FIXES
        pagebreak: {
            mode: ['avoid-all'], // avoid breaking content
        }

    }).from(element).toPdf().get('pdf').then(function (pdf) {

        // 🔥 FORCE SINGLE PAGE (VERY IMPORTANT)
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = totalPages; i > 1; i--) {
            pdf.deletePage(i);
        }

        let pdfBlob = pdf.output('blob');

        let formData = new FormData();
        formData.append("pdf", pdfBlob);
        formData.append("invoice_no", "<?= $invoiceNo ?>");

        fetch("send_invoice_mail.php", {
            method: "POST",
            body: formData
        })
        .then(res => res.text())
        .then(data => {
            alert(data);
        })
        .catch(err => {
            alert("Error: " + err);
        });

    });
}
</script>
</body>
</html>
