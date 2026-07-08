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
 <h2 class="card-inside-title">Cash Sheet Report</h2>    
    
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
   <a href="exports/cashsheet_export.php?from=<?php echo $fr;?>&to=<?php echo $to;?>"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="CASH SHEET  REPORT" />  </a>   
    </div>
    <div style="float: right;">
    <label ><b>Search Box:</b></label> <input type="text" id="searchBox" >
    </div>
                                   <table id="invoice_table" class="table table-striped table-bordered display nowrap" style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Date</th>
                                                <th aria-label="Invoice Number: activate to sort column ascending">Particulars</th>
                                                <th aria-label="Invoice Number: activate to sort column ascending">Vouchers</th>
                                                <th>Cash In</th>
                                                <th>Cash Out</th>
                                             <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                            <?php

  
if (!empty($fr) && !empty($to)) {
    $retval = mysqli_query($con, "
        SELECT * 
        FROM cash 
        WHERE date BETWEEN '$fr' AND '$to' 
        ORDER BY date DESC
    ") or die(mysqli_error($con));
}     
else
{
$retval = mysqli_query( $con, "SELECT * FROM cash order by date desc " ) or die(mysqli_error($con));
}       

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$st=0;$gt=0;$tt=0;
while($row=mysqli_fetch_array($retval)) {
   $date=$row['date'];
   $particulars=$row['remarks'];
   $inout=$row['in_out'];
   $amount=$row['amount'];
   $consig=$row['pid'];
                                             echo "<tr><td>$a</td><td>".date("d-m-Y", strtotime($date))."</td> <td>".$particulars."</td>";
                                             $retval1 = mysqli_query($con, "SELECT pid FROM cash") or die(mysqli_error($con));

// Assuming $consig is defined before this block
// Example:
// $consig = 'AWB12345';

$found = false;

while ($row1 = mysqli_fetch_assoc($retval1)) {
    $ty = $row1['pid'];

    if ($ty == $consig) {
        $query123 = "SELECT * FROM cash WHERE pid = '$consig'";
        $result123 = mysqli_query($con, $query123);

        while ($row123 = mysqli_fetch_assoc($result123)) {
            $filename = $row123['voucher'];
            // corrected key name
            $filepath = "upload-vouchers/" . $filename;
            if(!empty($filename))
            {
            if (file_exists($filepath)) {
                echo "<td>
                        <form method='post' action='view_voucher.php' target='_blank'>
                            <input type='hidden' name='filename' value='" . htmlspecialchars($filename) . "'>
                            <button type='submit'class='btn btn-info btn-circle-lg'><i
                                                        class='ti-eye'></i></button>
                        </form>
                      </td>";
            } 
}
else {
                echo "<td>NO VOUCHER</td>";
            }
            $found = true;
            break; // optional if only one record expected
        }
        break; // exit the outer loop too since we found the match
    }
}

if (!$found) {
    echo "<td>NO VOUCHER</td>";
}
                                            if($inout=="IN")
                                            {
                                                
                                                $gt+=$amount;
                                                echo"<td>".$amount."</td><td></td>";
                                            }
                                            else
                                            {
                                                
                                                $tt+=$amount;
                                                echo"<td></td><td>".$amount."</td>";
                                            }
                                            $a++;
                                           echo '<td> <button type="button" onclick="myConfirm('.$row['pid'].')" class="btn btn-danger btn-circle-lg"><i
                                                        class="ti-trash"></i></button></td></tr>';
}
?>
                                            
                                            </tbody>
                                       <tfoot>
<tr>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th></th>
                                                <th><?php echo $gt;?></th>
                                                <th><?php echo $tt;?></th>
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
                       
                       


<script src="invoice-table.js"></script>
 <script>
function myConfirm(acv){    
    var result = confirm("Are you really want to delete this item?");
    if(result){
        window.location.href ='delete/deletecash.php?vat='+acv;
    }
}
</script> 
<script>
    function myfc() {
  document.getElementById("frm1").submit();
}
    </script>
  <?php include('header/footer.php'); ?>