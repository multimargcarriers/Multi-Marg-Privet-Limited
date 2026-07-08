<?php
session_start();
include('config.php');
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
  echo "<script>window.location = 'index.php'</script>";
  exit;
}
$v=$_GET['code'];
$query="select * from tripsheet where pid=$v";
$result=mysqli_query($con,$query);
$row=mysqli_fetch_array($result);
$consignment=$row['trip'];
$dispatch_date=$row['date'];
$date_sort=date("d-m-Y", strtotime($dispatch_date));
$vtype=$row['vtype'];
$vno=$row['vno'];
$origin=strtoupper($row['origin']);
$destination=strtoupper($row['destination']);
$driver=$row['driver'];
$vendor=$row['vendor'];
$instruction=$row['instruction'];

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
      <div class="section-title">Trip Details</div>
      <table>
        <tr>
          <th>Trip No</th><td><?php echo $consignment; ?></td>
          <th>Date</th><td><?php echo $date_sort;?></td>
          <th>Vendor</th><td><?php echo $vendor;?></td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Vehicle Details</div>
      <table>
        <tr><th>Vehicle Type</th><td><?php echo $vtype;?></td></tr>
        <tr><th>Vehicle No</th><td><?php echo $vno;?></td></tr>
        <tr><th>Driver Name</th><td><?php echo $driver;?></td></tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Shipment Info</div>
      <table>
        <tr>
          
          <th>Origin</th><td><?php echo $origin;?></td>
          <th>Destination</th><td><?php echo $destination;?></td>
         
        </tr>
       
      </table>
    </div>

    <div class="section">
      <div class="section-title">Shipment Items</div>
      <table>
        <tr>
         <th>Client</th><th>Lr No</th><th>Consignor</th><th>Consignee</th><th>Box</th>
          <th>Weight</th><th>Invoice</th><th>Booking Type</th><th>Amount</th><th>Payment Type</th>
        </tr>
        <?php  
        $v1=$consignment;
        $query1 = mysqli_query($con, "SELECT * FROM material_details where trip='$v1'") or die(mysqli_error($con));
        while($row1=mysqli_fetch_array($query1)) {
         
        ?>
        <tr>
          <td><?php echo $row1['client'];?></td>
          <td><?php echo$row1['lr'];?></td>
           <td><?php echo$row1['consignor'];?></td>
            <td><?php echo$row1['consignee'];?></td>
          <td><?php echo $row1['box'];?></td>
          <td><?php echo $row1['weight'];?></td>
          <td><?php echo $row1['inv'];?></td>
        
          <td><?php echo $row1['booking_type'];?></td>
          <td><?php echo $row1['amount'];?></td>
          <td><?php echo $row1['payment_type'];?></td>
        </tr>
        <?php } ?>   
      </table>
    </div>

    

    <div class="remarks">
      NOTE: Quantity and quality not checked. We are not responsible for leakage & damage.  
      Subject to Uttarakhand jurisdiction only.
    </div>

    <div class="flex">
     
      <div>Receiver’s Sign & Stamp: __________</div>
    </div>

    <div class="footer">
      Booked by <strong><?php echo $t;?></strong> | Date: <span id="awb_date_footer"><?php echo $date_sort;?></span>
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
