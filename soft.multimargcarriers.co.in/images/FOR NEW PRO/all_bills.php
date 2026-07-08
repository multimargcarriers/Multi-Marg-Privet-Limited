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
 <h2 class="card-inside-title">All Bills</h2>    
    
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
    <div class="row">
      
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
           
  <?php
   $fr=0;$to=0;
if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
                                $fr=$_POST['fr'];
                                $to=$_POST['to'];
                             
                              
}         ?> 
 
<div class="container-fluid">
<div class="table-responsive">
    
<div class="table-container">
     <div style="float: left;">
   <a href="exports/allbills_export.php?from=<?php echo $fr;?>&to=<?php echo $to;?>"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="ALL BILLS REPORT" />  </a>   
    </div>
    <div style="float: right;">
    <label ><b>Search Box:</b></label> <input type="text" id="searchBox" >
    </div>
                                   <table id="invoice_table" class="table table-striped table-bordered display nowrap" style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Date</th>
                                                <th aria-label="Invoice Number: activate to sort column ascending">Invoice Number</th>
                                                <th>Client</th>
                                                <th>Mode</th>
                                                <th>Sub Total</th>
                                                <th>Gst</th>
                                                <th>Total</th>
                                                <th>Print</th>
                                                <th>Print1</th>
                                                
                                                <th>Edit</th>
                                                <th>Delete</th>
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
        ORDER BY invoice DESC
    ") or die(mysqli_error($con));
}     
else
{
$retval = mysqli_query( $con, "SELECT * FROM bills group by invoice having count(invoice)>=1  order by invoice desc " ) or die(mysqli_error($con));
}       

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$st=0;$gt=0;$tt=0;
while($row=mysqli_fetch_array($retval)) {
   $consig=$row['invoice'];
   $date1=$row['invoice_date'];
   $date="2025-09-25";
   $gstin=$row['gst'];
                                             echo "<tr><td>#</td><td>".date("d-m-Y", strtotime($row['invoice_date']))."</td> <td>".$row['invoice']."</td><td>".$row['client']."</td><td>".$row['mode']."</td>" ;  
                                            $retval1 = mysqli_query($con, "SELECT * FROM bills WHERE invoice = '$consig'") or die(mysqli_error($con));

if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$sub_total=0;$gst=0;$total=0;
while($row1=mysqli_fetch_array($retval1)) {

                                             $frieght=$row1['frieght'];
                                             $awb_charge=$row1['awb_charge'];
                                             $pickup=$row1['pickup'];
                                             $delivery=$row1['delivery'];
                                             $special_delivery=$row1['special_delivery'];
                                             $other_charge=$row1['other_charge'];
                                             $sub_total=$sub_total+$frieght+$awb_charge+$pickup+$delivery+$special_delivery+$other_charge;

                                             
                                             
                                           } echo "<td>".$sub_total."</td>" ;$st+=$sub_total;
                                           if($gstin=="YES")
                                           {
                                           if($date1>$date)
                                           {
                                               $gst=$sub_total*18/100;
    $gt+=$gst;
                                           }
                                           else
                                           {
 if($row['mode']=="Air")
 {
    $gst=$sub_total*18/100;
    $gt+=$gst;
 }
 else
 {
    $gst=$sub_total*12/100;
     $gt+=$gst;
 }
                                           }
                                           }
                                           else
                                           {
                                              $gst=0;
    $gt+=$gst; 
                                           }
 echo "<td>".$gst."</td>" ;
 $total=$sub_total+$gst;
 $tt+=$total;
 echo "<td>".$total."</td>" ;
                                                $pid=$row['pid'];

                                                echo '<td> <button type="button" class="btn btn-info btn-circle-lg" onclick="printBill('. $pid.')"><i
                                                        class="fa fa-print"></i></button></td>
                                                        
                                                
                                                        
                                                        
                                                 <td> <button type="button" class="btn btn-info btn-circle-lg" onclick="printBill1('. $pid.')"><i
                                                        class="fa fa-print"></i></button></td>
                                                <td> <a href="updatebill.php?code='.$pid.'"><button type="button" class="btn btn-info btn-circle-lg"><i
                                                        class="ti-eye"></i></button></td>
                                                <td> <button type="button" onclick="myConfirm('.$row['pid'].')" class="btn btn-danger btn-circle-lg"><i
                                                        class="ti-trash"></i></button></td></tr>';
}?>
                                            
                                            </tbody>
                                       <tfoot>
<tr>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th><?php echo $st;?></th>
                                                <th><?php echo $gt;?></th>
                                                <th><?php echo $tt;?></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                            </tr>
</tfoot>
                                    </table>
                                     <div class="pagination">
        <button id="prevPage">Prev</button>
        <span id="pageInfo"></span>
        <button id="nextPage">Next</button>
    </div>
                        </div>
                        </div></div>
                        </div></div>
                       
                        <script>
function myConfirm(a){    
    var result = confirm("Are you really want to delete this item?");
    if(result){
        window.location.href ='delete/deletebill.php?vat='+a;
    }
}
</script> 
<script>
function printBill(pid) {
    let choice = confirm("Do you want to print WITH SIGN?\n\nClick 'OK' for With Sign\nClick 'Cancel' for Without Sign");

    if (choice) {
        // With Sign
        window.open("bill.php?code=" + pid + "&sign=1", "_blank");
    } else {
        // Without Sign
        window.open("bill.php?code=" + pid + "&sign=0", "_blank");
    }
}
</script>
<script>
function printBill1(pid) {
    let choice = confirm("Do you want to print WITH SIGN?\n\nClick 'OK' for With Sign\nClick 'Cancel' for Without Sign");

    if (choice) {
        // With Sign
        window.open("bill1.php?code=" + pid + "&sign=1", "_blank");
    } else {
        // Without Sign
        window.open("bill1.php?code=" + pid + "&sign=0", "_blank");
    }
}
</script>
<script src="invoice-table.js"></script>
<script>
    function myfc() {
  document.getElementById("frm1").submit();
}
    </script>
  <?php include('header/footer.php'); ?>