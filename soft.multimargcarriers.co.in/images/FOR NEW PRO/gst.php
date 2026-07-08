<?php
// Start the session before any output
session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}

include('header/header.php');
include('config.php');

?>

 <div class="page-wrapper">
		<div class="page-breadcrumb">
         <div class="body">
 <h2 class="card-inside-title">Gst Report</h2>    
    
       <form class="login100-form validate-form" method="POST" id="frm1" >
        <div class="row clearfix">
        <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                    
                                    <label><b>FROM DATE</b></label>  <input type="date" class="form-control" name="fr" />                                    
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                 
                                    <label><b>TO DATE</b></label>  <input type="date" class="form-control" name="to"  />                                    
                                    </div>
                                </div>
                                </div>
                                 <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                         <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="myfc()" value="SEARCH" />                                   
                                    </div>
                                </div></center>

                                </form>
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
           


<div class="container-fluid">
<div class="table-responsive">
<div class="form-group">      
   <?php
   $fr=0;$to=0;
if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
                                $fr=$_POST['fr'];
                                $to=$_POST['to'];
                             
                              
}         ?>                             
                                    <a href="exports/gst_export.php?from=<?php echo $fr;?>&to=<?php echo $to;?>"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="GST REPORT" />  </a>                               
                                    </div>
                                    <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Date</th>
                                                <th>Invoice Number</th>
                                                <th>Client</th>
                                                  <th>GSTIN</th>
                                                <th>SAC/HSN</th>
                                                <th>Taxable Value</th>
                                                <th>IGst</th>
                                                <th>CGst</th>
                                                <th>SGst</th>
                                                <th>Total Tax</th>
                                                 <th>Grand Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                           <?php
if (!empty($fr) && !empty($to)) {
    $retval = mysqli_query($con, "
        SELECT * 
        FROM bills 
        WHERE invoice_date BETWEEN '$fr' AND '$to' 
        GROUP BY invoice 
        ORDER BY pid DESC
    ") or die(mysqli_error($con));
}     
else
{
$retval = mysqli_query( $con, "SELECT * FROM bills group by invoice having count(invoice)>=1  order by pid desc " ) or die(mysqli_error($con));
}       
    
 

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$st=0;$gt=0;$tt=0;
while($row=mysqli_fetch_array($retval)) {
   $consig=$row['invoice'];
    $client=$row['client'];
    $date1=$row['invoice_date'];
    $date="2025-09-25";
                                             echo "<tr><td>#</td><td>".date("d-m-Y", strtotime($row['invoice_date']))."</td> <td>".$row['invoice']."</td><td>".$row['client']."</td>";
                                             $retval12 = mysqli_query($con, "SELECT gst FROM client WHERE client = '$client'") or die(mysqli_error($con));

if(! $retval12 ) {
   die('Could not get data: ' . mysql_error());
}
while($row12=mysqli_fetch_array($retval12)) {

                                             $gstabc=$row12['gst'];
}
                                             echo"<td>$gstabc</td>";
                                             if($row['mode']=="Air")
 {echo "<td>996531</td>";
 }
  if($row['mode']=="Train")
 {echo "<td>996512</td>";
 }  
 if($row['mode']=="Road" || $row['mode']=="Local Tempo")
 { echo "<td>996511</td>";
 }
                                            $retval1 = mysqli_query($con, "SELECT * FROM bills WHERE invoice = '$consig'") or die(mysqli_error($con));

if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$sub_total=0;$gst=0;$total=0;$sgst=0;$cgst=0;$igst=0;
while($row1=mysqli_fetch_array($retval1)) {
$gstin=$row1['gst'];
                                             $frieght=$row1['frieght'];
                                             $awb_charge=$row1['awb_charge'];
                                             $pickup=$row1['pickup'];
                                             $delivery=$row1['delivery'];
                                             $special_delivery=$row1['special_delivery'];
                                             $other_charge=$row1['other_charge'];
                                             $sub_total=$sub_total+$frieght+$awb_charge+$pickup+$delivery+$special_delivery+$other_charge;

                                             
                                             
                                           } echo "<td>".$sub_total."</td>" ;$st+=$sub_total;
                             $code= substr($gstabc, 0, 2); 
                      
                            if($gstin=="YES")
                                           {
                                              
                             if($date1>$date)
                             {
                                 
                                if($code=="27")
  {
      $cgst=$sub_total*9/100;
  $sgst=$sub_total*9/100;}
  else{
    $igst=$sub_total*18/100;
  }  
                             }
                             else
                             { 
 if($row['mode']=="Air" )
 {
  if($code=="27")
  {$cgst=$sub_total*9/100;
  $sgst=$sub_total*9/100;}
  else{
    $igst=$sub_total*18/100;
  }
   
 }
 else
 {
   if($code=="27")
  {$cgst=$sub_total*6/100;
  $sgst=$sub_total*6/100;}
  else{
    $igst=$sub_total*12/100;
  }
 }
                             }
                                           }
                                           else
                                           {
                                               $cgst=0;
                                               $sgst=0;
                                               $igst=0;
                                           }
 $gst=$igst+$cgst+$sgst;
 $gt+=$gst;
 echo "<td>".$igst."</td><td>".$cgst."</td><td>".$sgst."</td><td>".$gst."</td>" ;
 $total=$sub_total+$gst;
 $tt+=$total;
 echo "<td>".$total."</td>" ;
                                                $pid=$row['pid'];

                                                echo '</tr>';
}?>
                                            
                                            </tbody>
                                       <tfoot>
<tr>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th><?php echo $st;?></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th><?php echo $gt;?></th>
                                                <th><?php echo $tt;?></th>
                                               
                                            </tr>
</tfoot>

                                    </table>
                        </div>
                        </div></div>
                        </div>
                        </div>
                        <script>
function myConfirm(a){    
    var result = confirm("Are you really want to delete this item?");
    if(result){
        window.location.href ='delete/deletebook.php?vat='+a;
    }
}
</script> 
<script>
    function myfc() {
  document.getElementById("frm1").submit();
}
    </script>
  <?php include('header/footer.php'); ?>