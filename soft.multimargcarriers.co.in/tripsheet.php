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


$query="select * from tripsheet order by trip desc limit 1";
                            $result=mysqli_query($con,$query);
                            $row=mysqli_fetch_array($result);
                            $lastst=$row['trip'];
                            $pid=$row['pid'];
                            if($lastst=="")
                            {
                                $a="0001";
                            }
                            else
                            {

                                $a=intval($lastst);
                               
                                $a=$a+1;
                                $a = str_pad($a, 3, '0', STR_PAD_LEFT);
                            
                            }
?>    <link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0/css/select2.min.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
 <style>
               .invoice-section {
  padding: 20px;
}

.invoice-section h3 {
  font-weight: 700;
  color: #9a4b1e;
}

.invoice-section h3 span {
  color: red;
}

.responsive-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 12px;
}

.responsive-table th {
  color: #27b7a5;
  font-weight: 600;
  text-align: center;
}

.responsive-table td {
  text-align: center;
}

.responsive-table input {
  width: 100%;
  padding: 12px;
  border-radius: 16px;
  border: 2px solid #7a1c4d;
  outline: none;
}

/* ===== MOBILE VIEW (EXACT MATCH) ===== */

@media (max-width: 768px) {

  /* Hide table header */
  .responsive-table thead {
    display: none;
  }

  /* Convert table to cards */
  .responsive-table,
  .responsive-table tbody,
  .responsive-table tr {
    display: block;
    width: 100%;
  }

  .responsive-table tr {
    background: #fff;
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 20px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  }

  .responsive-table td {
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px 0;
  }

  /* Label above input */
  .responsive-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #8b8b8b;
    margin-bottom: 6px;
  }

  .responsive-table input {
    width: 100%;
  }
}

/* Plus icon */
.plus {
  font-size: 28px;
  font-weight: bold;
  color: #27b7a5;
}
@media (max-width: 768px) {
  .fa {
    right: 0;
    top: auto;
    bottom: -22px;
    transform: none;
  }
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
            <form class="login100-form validate-form" method="POST" id="frm1" action="add/add-trip.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            <h2 class="card-inside-title" style="color: #6526D2;">Add Manifest</h2>
                            <div class="row clearfix">
                            <div class="col-sm-6" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b style="color: #A44C13;">Trip No</b></label> <input type="text"  class="form-control" name="trip" value="<?php echo $a;?>" required /> 
                                    </div>

                                </div>
                               <input type="text" name="pid" value="<?php echo $row['pid']; ?>" hidden>
                                <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Date<span style="color:red">*<span></b></label>  <input type="date" class="form-control" name="date"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-4" >
                                <div class="form-group">  
                                <label><b  style="color: #A44C13;">Vehicle Type<span style="color:red">*<span></b></label><select class="form-control show-tick" name="vtype">
                                        <option value="">-- Please select the Type--</option>
                                        <option value="ECCO">Ecco</option>
                                        <option value="TATA-ACE">Tata-Ace</option>
                                        <option value="BOLERO">Bolero</option>
                                        <option value="14FT">14ft</option>
                                        </select>
                                </div>
</div>
<div class="col-sm-4">
    <div class="form-group">  
        <label><b style="color: #A44C13;">Vehicle Rate<span style="color:red">*</span></b></label>
        <input type="text" class="form-control" name="vrate" id="vrate" placeholder="Enter Rate" readonly>
    </div>
</div>
                                
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Vehicle No<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="vtype">
                                        <option value="">-- Please select the Vehicle no--</option>
                                      
                                        <option value="UK06CC1470">UK06CC1470</option>
                                       <option value="UK06CC1469">UK06CC1469</option>
                                        <option value="TAXI">TAXI</option>
                                        <option value="DELHI MODI">DELHI MODI</option>
                                        </select>
                                    </div>
                                </div>
                                        <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Driver Name<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="driver"  required/>                                    
                                    </div>
                                </div>   
                                           <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Vendor<span style="color:red">*<span></b></label>  <select class="form-control show-tick "  name="vendor">
                            <option>-- Please select the Vendor--</option>
    
                            <?php 
    $query ="SELECT vendor FROM vendor order by vendor asc";
    $result = $con->query($query);
    if($result->num_rows> 0){
        while($optionData=$result->fetch_assoc()){
        $option =strtoupper($optionData['vendor']);
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
                                   <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Origin<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="origin"  required/>                                    
                                    </div>
                                </div>    
                                 <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Destination<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="destination"  required/>                                    
                                    </div>
                                </div>    
                               
                               
                                </div>
            </div>
            <div class="invoice-section">
                            <label><b style="color: #A44C13;">MATERIAL DETAILS<span style="color:red">*<span></b></label>
                            <i class="fa fa-plus" id="ad" onclick="cre()"
   style="font-size:24px; float:right; cursor:pointer;"
   aria-hidden="true"></i>
                            <div class="container-fluid">
            <div class="row">
                <div class="col-lg-12">
                    <div class="card">
                        
                        <table id="wrap" class="responsive-table">
                      
                            <thead>
                                <tr style="color:#14BCA3">
                                    <th><center><b>Client Name</b></center></th>
                                    <th><center><b>LR No</b></center></th>
                                     <th><center><b>Consignor</b></center></th>
                                     <th><center><b>Consignee</b></center></th>
                                    <th><center><b>Box</b></center></th>
                                    <th><center><b>Weight</b></center></th>
                                     <th><center><b>Ch. Weight</b></center></th>
                                    <th><center><b>Invoice No</b></center></th>
                                    
                                    <th><center><b>Booking Type</b></center></th>
                                     <th><center><b>Amount</b></center></th>
                                       <th><center><b>Payment Type</b></center></th>
                                    <th></th>
                                </tr>

                            </thead>
                            <tbody>
                               <tr>
                                <td data-label="Client"><select class="form-control show-tick "  name="client[]">
                            <option>--Client--</option>
    
                            <?php 
    $query ="SELECT client FROM trip_client order by client asc";
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
</select></td>
                                    <td data-label="Lr"> <input type="text" class="form-control" name="lr[]" /></td>
                                     <td data-label="Consignor"> <input type="text" class="form-control" name="consignor[]" /></td>
                                     <td data-label="Consignee"> <input type="text" class="form-control" name="consignee[]" /></td>
                                    <td data-label="Box"><input type="text" class="form-control" name="box[]" /></td>
                                     <td data-label="Weight"><input type="text" class="form-control" name="weight[]" /></td>
                                      <td data-label="Eway Bill"><input type="text" class="form-control" name="eway[]" /></td>
                                    <td data-label="Invoice"><input type="text" class="form-control" name="inv[]" /></td>
                                   
                                          <td data-label="Vehicle Type"><select class="form-control show-tick" name="booking_type[]">
                                        <option value="">Booking Type</option>
                                        <option value="Normal">Normal</option>
                                        <option value="Special">Special</option>
                                        <option value="Part Load">Part Load</option>
                                        </select></td>
                                                <td data-label="Amount"><input type="double" class="form-control" name="amount[]" /></th>
                                                <td data-label="Payment Type"><select class="form-control show-tick" name="payment_type[]">
                                        <option value="">Payment Type</option>
                                        <option value="To-Pay">To-Pay</option>
                                        <option value="Credit">Credit</option>
                                        <option value="Paid">Paid</option>
                                        </select></td>
                                   <td><input type="hidden" id="box" name="box1" value="1"></td>
                                </tr>
                                
                            </tbody>
                            
                        </table>

                    </div>
                </div>
            </div>
        </div>
            </div>                
       
                                <div class="col-sm-12" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Special Instruction<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="remarks" placeholder="Enter the Special Instruction"  required/>                                    
                                    </div>
                                </div>
                               
                                
                                
                               
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="ADD BOOKING" />                                 
                                    </div>
                                </div></center>
</div>
</div>
</div>

</form>   
<?php if($t!="Operation Team")
 include('tables/tripmanifest_table.php'); ?>

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
   
    <!-- apps -->
    <!-- apps -->
    <script>
    function submitForm() {
        // Using the native form submit method
        document.getElementById("frm1").submit();
    }

    </script>  <script >
        function cre(){

            var b=jQuery("#box").val();
            b++;
            if(b<=20){
            jQuery("#box").val(b);
        jQuery("#wrap").append('<tbody id="bloop'+b+'"><tr><td data-label="Client"><select class="form-control show-tick "  name="client[]"><option>--Client--</option><?php $query ="SELECT client FROM trip_client order by client asc";$result = $con->query($query);if($result->num_rows> 0){while($optionData=$result->fetch_assoc()){$option =strtoupper($optionData['client']);?><?php if(!empty($branch) && $awb== $option){?><option value="<?php echo $option; ?>" selected><?php echo $option; ?> </option><?php continue;}?><option value="<?php echo $option; ?>" ><?php echo $option; ?> </option><?php }} ?></select></td><td data-label="Lr"> <input type="text" class="form-control" name="lr[]" /></td><td data-label="Consignor"> <input type="text" class="form-control" name="consignor[]" /></td><td data-label="Consignee"> <input type="text" class="form-control" name="consignee[]" /></td><td data-label="Box"><input type="text" class="form-control" name="box[]" /></td><td data-label="Weight"><input type="text" class="form-control" name="weight[]" /></td><td data-label="Eway Bill"><input type="text" class="form-control" name="eway[]" /></td><td data-label="Invoice"><input type="text" class="form-control" name="inv[]" /></td><td data-label="Vehicle Type"><select class="form-control show-tick" name="booking_type[]"><option value="">Booking Type</option><option value="Normal">Normal</option><option value="Special">Special</option><option value="Part Load">Part Load</option></select></td><td data-label="Amount"><input type="double" class="form-control" name="amount[]" /></td> <td data-label="Payment Type"><select class="form-control show-tick" name="payment_type[]"><option value="">Payment Type</option><option value="To-Pay">To-Pay</option><option value="Credit">Credit</option><option value="Paid">Paid</option></select></td><td> <button class="btn btn-success btn-icon float-right"  onclick=rmore("'+b+'") type="button"><i class="zmdi zmdi-minus"></i></button></td></tr> </tbody>');
         } }
         function rmore(b){
         jQuery("#bloop"+b).remove();
         var bc=jQuery("#box").val();
         b--;
         jQuery("#box").val(b)}</script> <script>
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
<script>
document.querySelector("select[name='vtype']").addEventListener("change", function() {
    
    let rateField = document.getElementById("vrate");
    let type = this.value;

    let rates = {
        "Ecco": 6000,
        "Tata-Ace": 6800,
        "Bolero": 7500,
        "14ft": 9000
    };

    if (rates[type]) {
        rateField.value = rates[type];
    } else {
        rateField.value = "";
    }
});
</script>
    <?php include('header/footer.php'); ?>


