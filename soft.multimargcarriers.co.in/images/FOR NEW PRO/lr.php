<?php
session_start();
include('config.php');
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
  echo "<script>window.location = 'index.php'</script>";
  exit;
}
$v=$_GET['code'];
$query="select * from trip where pid=$v";
$result=mysqli_query($con,$query);
$row=mysqli_fetch_array($result);
$consignment=$row['awb'];
$dispatch_date=$row['date'];
$date_sort=date("d-m-Y", strtotime($dispatch_date));
$mode=$row['mode'];
$client=$row['client'];
$origin=strtoupper($row['origin']);
$destination=strtoupper($row['destination']);
$typeofdelivery=$row['type_of_delivery'];
$insured=$row['insured'];
$box=$row['box'];
$aweight=$row['actual_wt'];
$cweight=$row['charge_wt'];
$remarks=strtoupper($row['remarks']);
$consignor=strtoupper($row['consignor']);
$consignee=strtoupper($row['consignee']);
$description=strtoupper($row['description']);
$clerk=strtoupper($row['clerk_name']);
$fcharge=$row['frieght_charge'];
$acharge=$row['awb_charge'];
$pcharge=$row['pickup_charge'];
$dcharge=$row['delivery_charge'];
$pacharge=$row['packaging_charge'];
$hcharge=$row['handling_charge'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MULTIMARG CARRIERS</title>
  <style>
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background: #f6f6f6;
      margin: 0;
      padding: 0;
    }
    .awb-container {
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      margin: auto;
      padding: 5mm;
      border: 1px solid #ccc;
      box-sizing: border-box;
      position: relative;
    }
    h1 {
      text-align: center;
      font-size: 22px;
      margin: 0 0 15px;
      letter-spacing: 1px;
      color: #333;
    }
    .section {
      margin-bottom: 15px;
    }
    .section-title {
      background: #004080;
      color: #fff;
      padding: 5px 8px;
      font-weight: bold;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      font-size: 13px;
    }
    th {
      background: #f2f2f2;
      text-align: left;
    }
    .charges th, .charges td {
      width: 50%;
    }
    .flex {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      font-size: 13px;
    }
    .remarks {
      margin-top: 5px;
      font-size: 12px;
      padding: 5px;
      border: 1px dashed #999;
      background: #fcfcfc;
    }
    .footer {
      text-align: center;
      margin-top: 15px;
      font-size: 12px;
      color: #666;
    }

    /* Floating Button Group */
    .btn-group {
      position: fixed;
      top: 40%;
      right: 25px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 999;
    }
    .btn {
      background: #004080;
      color: #fff;
      border: none;
      padding: 10px 15px;
      font-size: 14px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0px 2px 5px rgba(0,0,0,0.3);
      transition: background 0.3s;
    }
    .btn:hover {
      background: #0066cc;
    }
@media screen and (max-width: 768px) {
  .awb-container {
    width: 95%;
    padding: 5px;
  }
  table, th, td {
    font-size: 10px;
    word-break: break-word;
  }
  .section-title {
    font-size: 13px;
    text-align: center;
  }
  .btn-group {
    right: 10px;
    top: 80%;
    flex-direction: row;
  }
  .btn {
    padding: 8px 10px;
    font-size: 13px;
  }
}
.websafe-calligraphy {
  font-family: 'Brush Script MT', 'Lucida Handwriting', cursive;
  font-size: 1.6em;
  color: #555;
  text-align: center;
}
    @media print {
      .btn-group { display: none; }
      body { background: #fff; }
      .awb-container { border: none; padding: 5mm; }
      .section-title { background: #000; color: #fff; }
    }
  </style>
</head>
<body>

  <!-- Floating Print & Download Buttons -->
  <div class="btn-group">
    <button class="btn" onclick="window.print()">🖨️ Print</button>
    <button class="btn" id="downloadPDF">⬇️ Download</button>
  </div>

  <div class="awb-container" id="awbContent">
    <div class="section">
      <center>
      <p class="section-title">
      <span style="font-size: 30px;">MULTIMARG CARRIERS PVT. LTD.</span><br>
       LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND<br>
       Contact:05944-324033 | info@multimargcarriers.co.in<br>
        GST No:05AANCM3054E1ZN</p></center>
    </div>

    <div class="section">
      <div class="section-title">AWB Details</div>
      <table>
        <tr>
          <th>AWB No</th><td><?php echo $consignment; ?></td>
          <th>Date</th><td><?php echo $date_sort;?></td>
          <th>Delivery Type</th><td colspan="3"><?php echo $typeofdelivery;?></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Parties</div>
      <table>
        <tr><th>Consignor</th><td><?php echo $consignor;?></td></tr>
        <tr><th>Consignee</th><td><?php echo $consignee;?></td></tr>
        <tr><th>Bill To</th><td><?php echo $client;?></td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Shipment Info</div>
      <table>
        <tr>
          <th>Pkg(s)</th><td><?php echo $box;?></td>
          <th>Origin</th><td><?php echo $origin;?></td>
          <th>Destination</th><td><?php echo $destination;?></td>
          <th>Mode</th><td><?php echo $mode;?></td>
        </tr>
        <tr>
          <th>Actual Weight</th><td><?php echo $aweight;?></td>
          <th>Charge Weight</th><td><?php echo $cweight;?></td>
          <th>Insured By</th><td><?php echo $insured;?></td>
          <th>Remarks</th><td><?php echo $remarks;?></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Shipment Items</div>
      <table>
        <tr>
         <th>Invoice No</th><th>Date</th><th>Qty</th>
          <th>Part No</th><th>Value</th><th>E-Way Bill</th>
        </tr>
        <?php  
        $v1=$consignment;
        $query1 = mysqli_query($con, "SELECT * FROM lr_details where awb='$v1'") or die(mysqli_error($con));
        while($row1=mysqli_fetch_array($query1)) {
          $date1=date("d-m-Y", strtotime($row1['invdate']));
        ?>
        <tr>
          <td><?php echo $row1['invoice'];?></td>
          <td><?php echo $date1;?></td>
          <td><?php echo $row1['quantity'];?></td>
          <td><?php echo $row1['part'];?></td>
          <td><?php echo $row1['value'];?></td>
          <td><?php echo $row1['eway'];?></td>
        </tr>
        <?php } ?>   
      </table>
    </div>

    <div class="section">
      <div class="section-title">Charges</div>
      <table>
        <tr><th>Freight Charge</th><td>₹<?php echo $fcharge; ?></td>
        <th>AWB Charge</th><td>₹<?php echo $acharge; ?></td></tr>
        <tr><th>Pickup Charge</th><td>₹<?php echo $pcharge; ?></td>
        <th>Delivery Charge</th><td>₹<?php echo $dcharge; ?></td></tr>
        <tr><th>Packaging Charge</th><td>₹<?php echo $pacharge; ?></td>
        <th>Handling Charge</th><td>₹<?php echo $hcharge; ?></td></tr>
      </table>
    </div>

    <div class="remarks">
      NOTE: Quantity and quality not checked. We are not responsible for leakage & damage.  
      Subject to Uttarakhand jurisdiction only.
    </div>

    <div class="flex">
      <div>Sender’s Signature:<u> <span class="websafe-calligraphy"><?php echo ucfirst(strtolower($clerk));?></span></u></div>
      <div>Receiver’s Sign & Stamp: __________</div>
    </div>

    <div class="footer">
      Booked by <strong><?php echo $clerk;?></strong> | Date: <span id="awb_date_footer"><?php echo $date_sort;?></span>
    </div>
  </div>

  <!-- HTML2PDF Script -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    document.getElementById("downloadPDF").addEventListener("click", function () {
      const element = document.getElementById("awbContent");
      const opt = {
        margin:       0.03,
        filename:     'AWB_<?php echo $consignment; ?>.pdf',
        image:        { type: 'jpeg', quality: 100 },
        html2canvas:  { scale: 1 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().from(element).set(opt).save();
    });
  </script>

</body>
</html>
