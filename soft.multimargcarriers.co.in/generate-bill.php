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


 
                            $query="select * from bills order by invoice desc limit 1";
                            $result=mysqli_query($con,$query);
                            $lr=0000;
                            $row=mysqli_fetch_array($result);
                            $last=$row['invoice'];
                            $last=substr($last,11);
                            if($last=="")
                            {
                                $lr="0001";
                            }
                            else
                            {

                               $lr=intval($last);
                                $lr=$lr+1;
                                $str_length = 4;
                                $str = substr("0000{$lr}", -$str_length);
                             
                            }
                        
                             
?>    <link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0/css/select2.min.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style>
   table {
    table-layout: auto !important;
}
th:nth-child(2),
td:nth-child(2) { min-width: 80px; }
th:nth-child(3),
td:nth-child(3) { min-width: 80px; }
th:nth-child(5),
td:nth-child(5) { min-width: 50px; }
th:nth-child(6),
td:nth-child(6) { min-width: 50px; }

td input {
    width: 100% !important;
    min-width: 100%;
}
</style>
        <!-- ============================================================== -->
        <!-- End Left Sidebar - style you can find in sidebar.scss  -->
        <!-- ============================================================== -->
        <!-- ============================================================== -->
        <!-- Page wrapper  -->
        <!-- ============================================================== -->
        <div class="page-wrapper">
		<div class="page-breadcrumb">
            
    <div class="row">
      
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
            <div class="container-fluid">
            <!-- Input -->
            <form class="login100-form validate-form" method="POST" id="frm1">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            
                            <h2 class="card-inside-title" style="color: #6526D2;">Generate Invoices</h2>
                            <div class="row clearfix">
                            <div class="col-sm-4" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b style="color: #A44C13;">Invoice Prefix<span style="color:red">*<span></b></label> <select class="form-control show-tick" name="prefix">
                                       
                                        <option value="MCPL/26-27/">MCPL/26-27/</option>
                                        <option value="MCPL/27-28/">MCPL/27-28/</option>
                                        <option value="MCPL/28-29/">MCPL/28-29/</option>
                                        <option value="MCPL/29-30/">MCPL/29-30/</option>
                                        </select>  
                                    </div>

                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Invoice No<span style="color:red">*<span></b></label> <input type="text"  class="form-control" name="invoice-no" value="<?php echo $str;?>" required /> 
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Invoice Date<span style="color:red">*<span></b></label>  <input type="date" class="form-control" name="invoice_date"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-12" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Client<span style="color:red">*<span></b></label>  <select class="form-control show-tick"  name="client">
                            <option>-- Please select the Client--</option>
    
                            <?php 
    $query ="SELECT client FROM client";
    $result = $con->query($query);
    if($result->num_rows> 0){
        while($optionData=$result->fetch_assoc()){
        $option =strtoupper($optionData['client']);
    ?>
    <?php
    //selected option
    if(!empty($branch) && $awb== $option){
    // selected option
    ?>
               <option value="<?php echo $option; ?>" selected><?php echo $option; ?> </option>
    <?php 
continue;
   }?>
    <option value="<?php echo $option; ?>" ><?php echo $option; ?> </option>
   <?php
    }}
    ?>
</select>                           
                                    </div>
                                </div>
                                <div class="col-sm-3" >
                                <div class="form-group">  
                                <label><b  style="color: #A44C13;">Mode<span style="color:red">*<span></b></label><select class="form-control show-tick" name="mode">
                                        <option value="">-- Please select the Mode--</option>
                                        <option value="Air">Air</option>
                                        <option value="Train">Train</option>
                                        <option value="Road">Road</option>
                                        <option value="Road Express">Road Express</option>
                                        </select>
                                </div>
</div>
<div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">From Date<span style="color:red">*<span></b></label>  <input type="date" class="form-control" name="from_date"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">To Date<span style="color:red">*<span></b></label>  <input type="date" class="form-control" name="to_date"  required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-3" >
                                <div class="form-group">  
                                <label><b  style="color: #A44C13;">GST<span style="color:red">*<span></b></label><select class="form-control show-tick" name="gst">
                                        <option value="">Please select if GST is applicable or not</option>
                                        <option value="YES">YES</option>
                                        <option value="NO">NO</option>
                                       </select>
                                </div>
</div>
                                </div>
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="SEARCH" />                                 
                                    </div>
                                </div></center>
</div>
</div>
</div>

</form>  

<?php 
	if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
		// Form submitted 
        $prefix=$_POST['prefix'];
		$client=$_POST['client'];
        $inv=$_POST['invoice-no'];
        $ind=$_POST['invoice_date'];
        $fromdt=$_POST['from_date'];
        $todt=$_POST['to_date'];
        $mode=$_POST['mode'];
        $gstin=$_POST['gst'];
        $invoice_no=$prefix.$inv;
        echo '   <form class="login100-form validate-form" method="POST" id="frm2" action="generated_bill.php">';
       echo' <div class="row clearfix"><div class="col-sm-3" data-validate = "Address code is required">
        <div class="form-group">                                    
        <label style="color:#14BCA3"><b>Invoice No</b></label> <b><input  type="text"  class="form-control" name="invoice" value="'.$invoice_no.'"/></b>
        </div>

    </div>
    <div class="col-sm-3" data-validate = "Address code is required">
        <div class="form-group">                                    
        <label style="color:#14BCA3"><b>Invoice Date</b></label> <input   type="date"  class="form-control" name="date" value="'.$ind.'"/>
        </div>
        </div>
        <div class="col-sm-3" data-validate = "Address code is required">
        <div class="form-group">                                    
        <label style="color:#14BCA3"><b>Client</b></label> <input   type="text"  class="form-control" name="client1" value="'.$client.'"/>
        </div>
        </div>
                                          
        <input   type="text"  class="form-control" name="gstin" value="'.$gstin.'" hidden/>
       
        <div class="col-sm-3" data-validate = "Address code is required">
        <div class="form-group">                                    
            <label style="color:#14BCA3"><b>Mode</b></label><select  class="form-control " data-placeholder="-- Please select the Mode--" name="mode1">
<option  value="'.$mode.'">'.$mode.'</option>
<option  value="AIR">AIR</option>
<option  value="TRAIN">TRAIN</option>
<option  value="ROAD">ROAD</option>
<option  value="ROAD EXPRESS">ROAD EXPRESS</option>
</select>
        </div>

    </div>
    </div>';

 

    echo '<div class="container-fluid">
<div>
                                    <table
                                       style="width:100%; table-layout:auto;" >
              <colgroup>
    <col>
    <col>
    <col>
    <col>
    <col>
    <col>
    <col>
    <col>
    <col>
    <col>
    <col>
</colgroup>
                                        <thead>
                                            <tr>
                                               <th><input type="checkbox" id="select-all"></th>
                                                <th>Awb No</th>
                                                <th>Date</th>
                                                <th>Origin</th>
                                                <th>Destination</th>
                                                <th>Pkg</th>
                                                <th>Weight</th>
                                                <th>Rate</th>
                                                <th>Frieght</th>
                                                <th>Awb Charge</th>
                                                <th>Pickup</th>
                                                <th>Delivery</th>
                                                <th>Special Delivery</th>
                                                <th>Other Charges</th>
                                            </tr>
                                        </thead>
                                        <tbody>';
                                            
                                        $sql ="SELECT * FROM trip where client='$client' AND status=0 AND  mode='$mode' AND date BETWEEN '$fromdt' AND '$todt'
        
       ";
                   // Debug
$retval = mysqli_query($con, $sql) or die("Query Failed: " . mysqli_error($con));                     

if(! $retval ) {
   
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row=$retval->fetch_assoc()) {
       $date_sort=$row['date'];
    
                                                $date= $date_sort;$awb = htmlspecialchars($row['awb'], ENT_QUOTES);
                                                $origin=$row['origin'];
                                                $destination=$row['destination'];
                            echo"    
                                   <tr> 
                                   <td><input type='checkbox' class='row-check' name='select_row[]' value='$awb'></td>
<td><input type='text' class='form-control' name='lr[$awb]' value=".$row['awb']."></td>
<td><input type='text' class='form-control' name='dt[$awb]' value=".$date."></td>
<td><input type='text' class='form-control' name='origin[$awb]' value=".$row['origin']."></td>
<td><input type='text' class='form-control' name='destination[$awb]' value=".$row['destination']."></td>
<td><input type='text' class='form-control' name='box[$awb]' value=".$row['box']."></td>
<td><input type='text' class='form-control weight' name='weight[$awb]' value=".$row['charge_wt']."></td>";
$m=strtoupper($row['mode']);
$c=$row['charge_wt'];
$o=strtoupper($row['origin']);
$d=strtoupper($row['destination']);

$retval1 = mysqli_query( $con, "SELECT * FROM rates where client='$client'" ) or die(mysqli_error($con));

if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;


while($row1=mysqli_fetch_array($retval1)) {
    $o1=strtoupper($row1['origin']);
$d1=strtoupper($row1['destination']);


if($m=='AIR' && $origin==$o1 && $destination==$d1 ){
 
    echo"<td>
    <input type='text'
           class='form-control rate'
           name='arate[$awb]'
           value='".$row1['air_rate']."'>
</td>
    <td><input type='text' class='form-control freight' name='frieght[$awb]' value=".($c*$row1['air_rate'])."></td>
    <td><input type='text' class='form-control' name='lrc[$awb]' value=".$row1['awb']."></td>
    <td><input type='text' class='form-control' name='ap[$awb]' value=".$row1['air_pickup']."></td>
    <td><input type='text' class='form-control' name='dp[$awb]' value=".$row1['air_delivery']."></td>
    <td><input type='text' class='form-control' name='sp[$awb]' value='0.00'></td>
    <td><input type='text' class='form-control' name='ot[$awb]' value='0.00'></td>";
    }
    elseif($m=='TRAIN' && $o==$o1 && $d==$d1 ){
        echo"<td><input type='text' class='form-control rate' name='arate[$awb]' value=".$row1['train_rate']."></td>
        <td><input type='text' class='form-control freight' name='frieght[$awb]' value=".($c*$row1['train_rate'])."></td>
        <td><input type='text' class='form-control' name='lrc[$awb]' value=".$row1['awb']."></td>
        <td><input type='text' class='form-control' name='ap[$awb]' value=".$row1['train_pickup']."></td>
        <td><input type='text' class='form-control' name='dp[$awb]' value=".$row1['train_delivery']."></td>
        <td><input type='text' class='form-control' name='sp[$awb]' value='0.00'></td>
        <td><input type='text' class='form-control' name='ot[$awb]' value='0.00'></td>";
        }
        elseif($m=='ROAD' && $o==$o1 && $d==$d1 ){
            echo"<td><input type='text' class='form-control rate' name='arate[$awb]' value=".$row1['road_rate']."></td>
            <td><input type='text' class='form-control freight' name='frieght[$awb]' value=".($c*$row1['road_rate'])."></td>
            <td><input type='text' class='form-control' name='lrc[$awb]' value=".$row1['awb']."></td>
            <td><input type='text' class='form-control' name='ap[$awb]' value=".$row1['road_pickup']."></td>
            <td><input type='text' class='form-control' name='dp[$awb]' value=".$row1['road_delivery']."></td>
            <td><input type='text' class='form-control' name='sp[$awb]' value='0.00'></td>
            <td><input type='text' class='form-control' name='ot[$awb]' value='0.00'></td>";
            }
             elseif($m=='ROAD EXPRESS' && $o==$o1 && $d==$d1 ){
            echo"<td><input type='text' class='form-control rate' name='arate[$awb]' value=".$row1['roadexpress_rate']."></td>
            <td><input type='text' class='form-control freight' name='frieght[$awb]' value=".($c*$row1['roadexpress_rate'])."></td>
            <td><input type='text' class='form-control' name='lrc[$awb]' value=".$row1['awb']."></td>
            <td><input type='text' class='form-control' name='ap[$awb]' value=".$row1['roadexpress_pickup']."></td>
            <td><input type='text' class='form-control' name='dp[$awb]' value=".$row1['roadexpress_delivery']."></td>
            <td><input type='text' class='form-control' name='sp[$awb]' value='0.00'></td>
            <td><input type='text' class='form-control' name='ot[$awb]' value='0.00'></td>";
            }
        
        }
        
        echo "</tr>";
}
echo "</tbody></table>";
echo "<center><button type='button' class='btn btn-raised btn-primary waves-effect' onclick='myok()'>GENERATE & PRINT</button</center></form> ";
}

















    
?>

</div>

      </div>
    </div>

        <!-- ============================================================== -->
  <!-- ============================================================== -->
</div></div>      </div>                        
    <!-- ============================================================== -->
    <!-- End Wrapper -->
    <!-- ============================================================== -->
    <!-- End Wrapper -->
    <!-- ============================================================== -->
    <!-- All Jquery -->
    <!-- ============================================================== -->
   
    <!-- apps --><script>

function calculateFreight(row)
{
    let weight = parseFloat(row.querySelector('.weight').value) || 0;
    let rate   = parseFloat(row.querySelector('.rate').value) || 0;

    row.querySelector('.freight').value =
        (weight * rate).toFixed(2);
}

document.addEventListener('input', function(e)
{
    if (
        e.target.classList.contains('weight') ||
        e.target.classList.contains('rate')
    )
    {
        calculateFreight(
            e.target.closest('tr')
        );
    }
});

window.addEventListener('load', function()
{
    document.querySelectorAll('tbody tr').forEach(function(row)
    {
        if(
            row.querySelector('.weight') &&
            row.querySelector('.rate') &&
            row.querySelector('.freight')
        )
        {
            calculateFreight(row);
        }
    });
});

</script>
    <!-- apps -->
    <script>
    function submitForm() {
        // Using the native form submit method
        document.getElementById("frm1").submit();
    }

    </script><script>
document.addEventListener("DOMContentLoaded", function () {

    const selectAll = document.getElementById('select-all');

    if (selectAll) {
        selectAll.addEventListener('change', function () {
            let checkboxes = document.querySelectorAll('.row-check');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }

});
</script> <script>
    function myok() {
  document.getElementById("frm2").submit();
}
    </script> <script>
document.addEventListener("DOMContentLoaded", function () {

    const selectAll = document.getElementById('select-all');

    if (selectAll) {
        selectAll.addEventListener('change', function () {

            // ✅ If DataTable is active
            if ($.fn.DataTable && $.fn.DataTable.isDataTable('#default_order')) {

                let table = $('#default_order').DataTable();

                // Select ALL rows across ALL pages
                table.rows().nodes().to$().find('.row-check').prop('checked', this.checked);

            } else {
                // ✅ Normal table fallback
                let checkboxes = document.querySelectorAll('.row-check');
                checkboxes.forEach(cb => cb.checked = this.checked);
            }

        });
    }

});
</script> <script>
// Assuming $searchValue is the unique value you want to search for
var searchValue = "<?php echo htmlspecialchars($searchValue); ?>";

// JavaScript code to set the selected option based on the unique value
document.addEventListener("DOMContentLoaded", function() {
    var select = document.getElementById('branchSelect');
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === searchValue) {
            select.options[i].selected = true;
            break;
        }
    }
});
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0/js/select2.min.js"></script>
<script>
    $(document).ready(function() {
        $('.select2').select2();
    });
</script>
    <?php include('header/footer.php'); ?>


