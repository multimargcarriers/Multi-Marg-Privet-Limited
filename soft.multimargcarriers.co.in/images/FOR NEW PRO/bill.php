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
$sign=$_GET["sign"];
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
                  <b class="tm_f11 tm_white_color"><?php echo $invoice; ?></b></center>
                </div>
                
                <div><center>
                  <span class="tm_white_color_60">Invoice Date:</span> <br>
                  <b class="tm_f11 tm_white_color"><?php echo $invoicedate; ?></b></center>
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
                      <th  class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Lr No</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Date</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Ref No</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Origin</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Dest</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Pkg</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Wt</b></th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Rate</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Frieght</b></th>
                       <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Lr Charge</b></th>
                        <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Pickup</b></th>
                         <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Delivery</b></th>
                          <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Spcl Delivery</b></th>
                           <th class="tm_width_1 tm_semi_bold tm_accent_color" style="font-size: xx-small;color:black"><b>Other Charges</th>
                      <th class="tm_width_1 tm_semi_bold tm_accent_color " style="font-size: xx-small;color:black"><b>Total</b></th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php
                    

$retval = mysqli_query( $con, "select * from bills where invoice='$invoice' order by awb_date asc" ) or die(mysqli_error($con));

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$total=0;$x=0;$tt=0;
while($row=mysqli_fetch_array($retval)) {
	$x++;
    if($x % 2 != 0)
    {
        echo '<tr class="tm_gray_bg">';
    }
    else
    {
        echo '<tr>';
    
    } 
    $lr=$row['awb'];
    $lr_date=date("d-m-y", strtotime($row['awb_date']));
     $lrQuery = mysqli_query($con, "SELECT * FROM lr_details WHERE awb = '$lr'");
    
    $invoices =  [];

    while ($lr1 = mysqli_fetch_assoc($lrQuery)) {
        $invoices[] = $lr1['invoice'];
    }
    $inv = implode("<br>", $invoices);;

    $origin=$row['origin'];
    $dest=$row['destination'];
    $retval12 = mysqli_query( $con, "select * from city where city='$origin' ") or die(mysqli_error($con));

if(! $retval12 ) {
   die('Could not get data: ' . mysql_error());
}

while($row12=mysqli_fetch_array($retval12)) {
  $org=$row12['code'];
}
 $retval123 = mysqli_query( $con, "select * from city where city='$dest' ") or die(mysqli_error($con));

if(! $retval123 ) {
   die('Could not get data: ' . mysql_error());
}

while($row123=mysqli_fetch_array($retval123)) {
  $des=$row123['code'];
}
    $pkg=$row['box'];
    $wt=$row['weight'];
    $rate=$row['rate'];
    $frieght=$row['frieght'];
    $awb_charge=$row['awb_charge'];
    $pickup=$row['pickup'];
    $delivery=$row['delivery'];
    $spcl=$row['special_delivery'];
    $other=$row['other_charge'];
    $gstin=$row['gst'];
    $total=$frieght+$awb_charge+$pickup+$delivery+$spcl+$other;
                    
                  echo '    <td class="tm_width_1"  style="font-size: xx-small;color:black">'.
                        $lr
                      .'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$lr_date.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$inv.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$org.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$des.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$pkg.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$wt.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$rate.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$frieght.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$awb_charge.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$pickup.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$delivery.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$spcl.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$other.'</td>
                      <td class="tm_width_1" style="font-size: xx-small;color:black">'.$total.'</td>
                    </tr>';
                    $tt+=$total;
}
?>

                   
                  </tbody>
                </table>
              </div>
            </div>
            <div class="tm_invoice_footer tm_mb15 tm_m0_md">
              <div class="tm_left_footer">
                <div class="tm_card_note tm_ternary_bg tm_white_color"><b style="color:#070947;">Payment info: </b><br><b class="tm_white_color_60" style="color:black;">BANK ACCOUNT NO :</b><span style="color:#070947">37440200000739</span> <br><b class="tm_white_color_60" style="color:black;">IFSC CODE :</b><span style="color:#070947"> BARB0VIMPUN (5th Letter is zero)</span><br><b class="tm_white_color_60" style="color:black;">BANK NAME :</b><span style="color:#070947"> BANK OF BARODA</span><br><b class="tm_white_color_60" style="color:black;">BANK BRANCH :</b> <span style="color:#070947">VIMAN NAGAR</span></div>
                
              </div>
              <div class="tm_right_footer">
                  
                <table class="tm_mb15">
                  <tbody>
                    <tr>
                      <td class="tm_width_3 tm_primary_color tm_border_none tm_bold">Subtoal</td>
                      <td class="tm_width_3 tm_primary_color tm_text_right tm_border_none tm_bold"><?php echo $tt; ?></td>
                    </tr>
                    <tr>
                      <?php
$date="2025-09-25";
if($gstin=="YES")
                                           {
                      if ($cg1=="27")
                      {
                          if($date1>$date)
                          {
                              $gs=round(($tt*9/100),2);
                        $gst=round(($gs*2),2);
                        echo '<td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">CGst 9%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gs.'</td></tr>';
                       echo '<tr><td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">SGst 9%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gs.'</td>';
                        }
                        else
                        {
                        if($mode=='AIR')
                        {
                          $gs=round(($tt*9/100),2);
                        $gst=round(($gs*2),2);
                        echo '<td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">CGst 9%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gs.'</td></tr>';
                       echo '<tr><td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">SGst 9%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gs.'</td>';
                        }
                        else
                        {
$gs=round(($tt*6/100),2);
                        $gst=round(($gs*2),2);
                        echo '<td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">CGst 6%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gs.'</td></tr>';
                       echo '<tr><td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">SGst 6%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gs.'</td>';
                        }
                        
                      }
                      }
                      else
                      {
                        if($date1>$date)
                          {
                            $gst=round(($tt*18/100),2);
                        echo '<td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">IGst 18%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gst.'</td>';
                        }
                        else
                        {
                        if($mode=='AIR')
                        {
                          $gst=round(($tt*18/100),2);
                        echo '<td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">IGst 18%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gst.'</td>';
                        }
                        else
                        {
 $gst=round(($tt*12/100),2);
                        echo '<td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">IGst 12%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gst.'</td>';
                        }
                        }
                      }
                                           }
                                           else
                                           {
                                              $gst=0;
                        echo '<td class="tm_width_3 tm_danger_color tm_border_none tm_pt0">IGst 18%</td>
                      <td class="tm_width_3 tm_danger_color tm_text_right tm_border_none tm_pt0">'.$gst.'</td>'; 
                                           }
                      $gtotal=$tt+$gst;
                      ?>
                     
                    </tr>
                   
                    <tr>
                      <td class="tm_width_3 tm_border_top_0 tm_bold tm_f16 tm_white_color tm_accent_bg tm_radius_6_0_0_6">Grand Total	</td>
                      <td class="tm_width_3 tm_border_top_0 tm_bold tm_f16 tm_primary_color tm_text_right tm_white_color tm_accent_bg tm_radius_0_6_6_0"><?php echo $gtotal;?></td>
                    </tr>
                    <?php
function convertNumberToWords($number) {
    $no = floor($number);
    $point = round($number - $no, 2) * 100;
    $hundred = null;
    $digits_1 = strlen($no);
    $i = 0;
    $str = array();
    $words = array(
        0 => '', 1 => 'One', 2 => 'Two',
        3 => 'Three', 4 => 'Four', 5 => 'Five', 6 => 'Six',
        7 => 'Seven', 8 => 'Eight', 9 => 'Nine',
        10 => 'Ten', 11 => 'Eleven', 12 => 'Twelve',
        13 => 'Thirteen', 14 => 'Fourteen', 15 => 'Fifteen',
        16 => 'Sixteen', 17 => 'Seventeen', 18 => 'Eighteen',
        19 => 'Nineteen', 20 => 'Twenty', 30 => 'Thirty',
        40 => 'Forty', 50 => 'Fifty', 60 => 'Sixty',
        70 => 'Seventy', 80 => 'Eighty', 90 => 'Ninety'
    );
    $digits = array('', 'Hundred', 'Thousand', 'Lakh', 'Crore');
    while ($i < $digits_1) {
        $divider = ($i == 2) ? 10 : 100;
        $number = floor($no % $divider);
        $no = floor($no / $divider);
        $i += ($divider == 10) ? 1 : 2;
        if ($number) {
            $plural = (($counter = count($str)) && $number > 9) ? 's' : null;
            $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
            $str [] = ($number < 21) ? $words[$number] .
                " " . $digits[$counter] . $plural . " " . $hundred
                :
                $words[floor($number / 10) * 10]
                . " " . $words[$number % 10] . " "
                . $digits[$counter] . $plural . " " . $hundred;
        } else $str[] = null;
    }
    $str = array_reverse($str);
    $result = implode('', $str);
    $points = ($point) ?
        "and " . $words[floor($point / 10) * 10] . " " . $words[$point % 10] . " Paise" : '';
    return trim($result) . " Rupees " . $points . " Only";
}
?>
 <tr> <td colspan="2" class="tm_width_3 tm_bold tm_text_left">
   <b style="color:black;">Amount in Words:</b>  <?php echo convertNumberToWords($gtotal); ?>
  </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="tm_invoice_footer tm_type1">
              <div class="tm_left_footer"><p class="tm_mb2"><b class="tm_primary_color">Terms & Conditions:</b></p>
                <ul style="list-style-type:square; "  ><li>Payment due on receipt of the bill.</li> <li>Payment to be made by Cheque/DD/RTGS in favour of SKY 4 LOGISTICS only.</li><li>Interest will be charged at 18% per annum if the payment not made within agreed period.</li></ul></div>
              <div class="tm_right_footer">
                <div class="tm_sign tm_text_center">
                    <?php 
                    if($sign==1){?>
                  <img src="assets1/img/sign.png" width="100px" height="200px" alt="Sign">
                  <?php } else { ?>
                   <img src="download.jpg" width="100px" height="200px" alt="Sign"> <?php } ?>
                  <p class="tm_m0 tm_ternary_color">Deepak Bharti</p>
                  <p class="tm_m0 tm_f16 tm_primary_color">Accounts Manager</p>
                </div>
              </div>
            </div>
          </div>
         
        </div>
      </div>
      <div class="tm_invoice_btns tm_hide_print">
        <a href="javascript:window.print()" class="tm_invoice_btn tm_color1">
          <span class="tm_btn_icon">
            <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M384 368h24a40.12 40.12 0 0040-40V168a40.12 40.12 0 00-40-40H104a40.12 40.12 0 00-40 40v160a40.12 40.12 0 0040 40h24" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><rect x="128" y="240" width="256" height="208" rx="24.32" ry="24.32" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path d="M384 128v-24a40.12 40.12 0 00-40-40H168a40.12 40.12 0 00-40 40v24" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><circle cx="392" cy="184" r="24" fill='currentColor'/></svg>
          </span>
          <span class="tm_btn_text">Print</span>
        </a>
        <button  class="tm_invoice_btn tm_color2" id="pdfButton">
          <span class="tm_btn_icon">
            <svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M320 336h76c55 0 100-21.21 100-75.6s-53-73.47-96-75.6C391.11 99.74 329 48 256 48c-69 0-113.44 45.79-128 91.2-60 5.7-112 35.88-112 98.4S70 336 136 336h56M192 400.1l64 63.9 64-63.9M256 224v224.03" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>
          </span>
          <span class="tm_btn_text">Download</span>
        </button>
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
    
  <script>
const { jsPDF } = window.jspdf;

document.getElementById('pdfButton').addEventListener('click', function() {
    const element = document.querySelector('.tm_container');

    html2canvas(element, { scale: 1, useCORS: true }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');

        // Create PDF in A4
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Calculate scale to fit image into A4
        const imgProps = pdf.getImageProperties(imgData);
        const pdfImgWidth = pageWidth;
        const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfImgWidth, pdfImgHeight);
        pdf.save('<?php echo $invoice;?>.pdf');
    }).catch(err => {
        console.error('Error generating PDF:', err);
        alert('Error generating PDF. Please try again.');
    });
});
</script>
</body>
</html>