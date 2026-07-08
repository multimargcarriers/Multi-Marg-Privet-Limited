<?php
session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}  
include ('config.php')?>

<!DOCTYPE html>
<html class="no-js" lang="en">

<head>
  <!-- Meta Tags -->
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="Laralink">
  <!-- Site Title -->
  <title>Sky4 Logistics</title>
  <link rel="stylesheet" href="assets1/css/style.css">
  <style>
.right {
  float: right;
  width: 60%;
  
  
}
.left {
  float: left;
  width: 40%;
  
 
}
.tm_table_responsive table {
    border-collapse: collapse; /* neat borders */
    width: 100%;
  }
  .tm_table_responsive th,
  .tm_table_responsive td {
    border: 1px solid #81B2F0; /* black border */
    padding: 2px; /* small spacing */
    text-align: center;
  }
</style>
</head>

<body >
  <div class="tm_container" >
    <div class="tm_invoice_wrap" style="border: 2px solid #000238;  border-radius: 10px;">
      <div class="tm_invoice tm_style2" id="tm_download_section">
        <div class="tm_invoice_in">
          <div class="tm_invoice_head tm_top_head tm_mb20">
            <div class="tm_invoice_left">
              <div class="tm_logo"><img src="assets1/img/logo.jpg"  alt="Logo"></div>
            </div>
            <div class="tm_invoice_right">
              <div class="tm_grid_row tm_col_6">
                <div>
                  <center>
                    <b class="tm_f30 " style="font-family: Times New Roman; color: #0380cd;">SKY 4 LOGISTICS</b><br>
                    <b style="color: #0380cd;font-family: Times New Roman;">Your Destination, Our Commitment.</b><br>
                    <b class="tm_f14 ">GST NO : 27NAOPK8620M1ZR&nbsp;&nbsp;&nbsp;&nbsp;PAN NO:NAOPK8620M</b><br>
                    <b class="tm_f14 ">GAT NO:52,  CHIMBALI PHATA,TAL-KHED, PUNE , MAHARASHTRA-410501</b><br>
                    <b class="tm_f14 ">www.sky4logistics.co.in &nbsp;&nbsp;            info@sky4logistics.co.in</b>


                  </center>
                </div>
                
              </div>
            </div>
          </div>
          <div class="tm_invoice_info tm_mb10">
            <div class="left">
              <p class="tm_mb2"><b>Invoice To:</b></p>
              <?php
$inv=$_GET["code"];

$retval = mysqli_query( $con, "SELECT * FROM bills where  pid='$inv'" ) or die(mysqli_error($con));

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row=mysqli_fetch_array($retval)) {
	$invoice=$row['invoice'];
	$date1=$row['invoice_date'];
    $invoicedate=date("d-m-Y", strtotime($row['invoice_date']));
    $mode=strtoupper($row['mode']);
    if($mode=='AIR')
    {
        $sac=996531;
    }
    elseif ($mode=='TRAIN') {
        $sac=996512;
    }else{
        $sac=996511;
    }
	$resStr = strtoupper($row['client']);
	echo "<p><b  class='tm_f14 tm_primary_color'>$resStr</b><br>";
  break;
}
$retval1 = mysqli_query( $con, "SELECT * FROM client where client='$resStr'" ) or die(mysqli_error($con));

if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row1=mysqli_fetch_array($retval1)) {
	
	$resStr1 = strtoupper($row1['address']);
	echo "$resStr1<br>";
  $cg=$row1['gst'];
   $cg1= substr($cg, 0, 2); 
  echo "<span><b>GSTIN:  </b>".$cg."</span></p>";
  
}
?>
              
                
            </div>
            <div class="right">
              <div class="tm_ternary_color tm_f20 tm_text_uppercase tm_text_center tm_invoice_title tm_mb15 tm_mobile_hide" style="color:#000238">Tax Invoice</div>
              <div class="tm_grid_row tm_col_4 tm_invoice_info_in tm_accent_bg">
                <div><center>
                  <span class="tm_white_color_60">Invoice No:</span> <br>
                  <b class="tm_f12 tm_white_color"><?php echo $invoice; ?></b></center>
                </div>
                
                <div><center>
                  <span class="tm_white_color_60">Invoice Date:</span> <br>
                  <b class="tm_f12 tm_white_color"><?php echo $invoicedate; ?></b></center>
                </div>
                <div>
                    <center>

                  <span class="tm_white_color_60">Mode:</span> <br>
                  <b class="tm_f12 tm_white_color"><?php echo $mode; ?></b>
</center>
                </div>
                 <div><center>
                  <span class="tm_white_color_60">Sac Code:</span> <br>
                  <b class="tm_f12 tm_white_color"><?php echo $sac; ?></b></center>
                </div>
              </div>
            </div>
          </div>
          <div class="tm_table tm_style1">
            <div class="tm_round_border">
              <div class="tm_table_responsive" >
                <table >
                  <thead >
                    <tr>
                      <th  class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Lr No</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Date</b></th>
                     
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Origin</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Dest</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Pkg</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Wt</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Rate</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Frieght</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Lr Charge</b></th>
                        <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Pickup</b></th>
                         <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Delivery</b></th>
                          <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Spcl Delivery</b></th>
                           <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: small;color:black"><b>Other Charges</th>
                   
                    </tr>
                  </thead>
                 <form method="POST" action="update_invoice.php">
  <tbody>
    <?php
    $retval = mysqli_query($con, "SELECT * FROM bills WHERE invoice='$invoice' ORDER BY awb_date ASC") or die(mysqli_error($con));

    while($row=mysqli_fetch_array($retval)) {
        $lr = $row['awb'];
        $lr_date = date("d-m-y", strtotime($row['awb_date']));
        $origin = $row['origin'];
        $dest = $row['destination'];
        $pkg = $row['box'];
        $wt = $row['weight'];
        $rate = $row['rate'];
        $frieght = $row['frieght'];
        $awb_charge = $row['awb_charge'];
        $pickup = $row['pickup'];
        $delivery = $row['delivery'];
        $spcl = $row['special_delivery'];
        $other = $row['other_charge'];

        echo "
        <tr>
          <td>$lr<input type='hidden' name='lr[]' value='$lr'></td>
          <td >$lr_date</td>
          <td>$origin</td>
          <td>$dest</td>
          <td><input type='number' name='box[]' value='$pkg' style='width:80px;'></td>
          <td><input type='number' name='weight[]' value='$wt' style='width:80px;'></td>
          <td><input type='number' name='rate[]' value='$rate' style='width:80px;'></td>
          <td><input type='number' name='frieght[]' value='$frieght' style='width:80px;'></td>
          <td><input type='number' name='awb_charge[]' value='$awb_charge' style='width:80px;'></td>
          <td><input type='number' name='pickup[]' value='$pickup' style='width:80px;'></td>
          <td><input type='number' name='delivery[]' value='$delivery' style='width:80px;'></td>
          <td><input type='number' name='special_delivery[]' value='$spcl' style='width:80px;'></td>
          <td><input type='number' name='other_charge[]' value='$other' style='width:80px;'></td>
        </tr>";
    }
    ?>
  </tbody>
  
  
                </table>
                
              </div>
            </div>
           <center><button type="submit" name="saveChanges" class="tm_btn tm_accent_bg tm_white_color" style="margin-top:10px;">Save Changes</button></center> 
</form>
            
          </div>
         
        </div>
      </div>
      
    </div>
  </div>
  <script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script><script src="assets1/js/jquery.min.js"></script>
  <script src="assets1/js/jspdf.min.js"></script>
  <script src="assets1/js/html2canvas.min.js"></script>
  <script src="assets1/js/main.js"></script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015" integrity="sha512-ZpsOmlRQV6y907TI0dKBHq9Md29nnaEIPlkf84rnaERnq6zvWvPUqr2ft8M1aS28oN72PdrCzSjY4U6VaAw1EQ==" data-cf-beacon='{"version":"2024.11.0","token":"6f756f02820545e3be40ddc6eb6154c3","r":1,"server_timing":{"name":{"cfCacheStatus":true,"cfEdge":true,"cfExtPri":true,"cfL4":true,"cfOrigin":true,"cfSpeedBrain":true},"location_startswith":null}}' crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    
  
</body>
</html>