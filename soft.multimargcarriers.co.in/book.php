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


$query="select * from trip order by awb desc limit 1";
                            $result=mysqli_query($con,$query);
                            $row=mysqli_fetch_array($result);
                            $lastst=$row['awb'];
                            $pid=$row['pid'];
                            if($lastst=="")
                            {
                                $a="0001";
                            }
                            else
                            {

                                $a=intval($lastst);
                               
                                $a=$a+1;
                                $a = str_pad($a, 4, '0', STR_PAD_LEFT);
                            
                            }
?>    <link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0/css/select2.min.css" rel="stylesheet" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

        <!-- ============================================================== -->
        <!-- End Left Sidebar - style you can find in sidebar.scss  -->
        <!-- ============================================================== -->
        <!-- ============================================================== -->
        <!-- Page wrapper  -->
        <!-- ============================================================== -->
        <div class="page-wrapper">
		<div class="page-breadcrumb">
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
    <div class="row">
      
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
            <div class="container-fluid">
            <!-- Input -->
            <form class="login100-form validate-form" method="POST" id="frm1" action="add/add-book.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            <h2 class="card-inside-title" style="color: #6526D2;">Add Booking</h2>
                            <div class="row clearfix">
                            <div class="col-sm-6" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b style="color: #A44C13;">Awb No</b></label> <input type="text"  class="form-control" name="awb" value="<?php echo $a;?>" required /> 
                                    </div>
                                    
<input type="text" name="pid" value="<?php echo $row['pid']; ?>" hidden>
                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                   <label><b  style="color: #A44C13;">Billed To<span style="color:red">*<span></b></label>  <select class="form-control show-tick"  name="client">
                            <option>-- Please select the Client--</option>
    
                            <?php 
    $query ="SELECT client FROM client order by client asc";
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
                                <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Date<span style="color:red">*<span></b></label>  <input type="date" class="form-control" name="date"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-6" >
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
                                <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Consignor<span style="color:red">*<span></b></label>  <select class="form-control show-tick "  name="consignor">
                            <option>-- Please select the Consignor--</option>
    
                            <?php 
    $query ="SELECT client FROM client order by client asc";
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
                                              
                                  <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Consignee<span style="color:red">*<span></b></label>  <select class="form-control show-tick "  name="consignee">
                            <option>-- Please select the Consignee--</option>
    
                            <?php 
    $query ="SELECT client FROM client order by client asc";
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
                                <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Origin<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="origin">
                            <option>-- Please select the Origin--</option>
    
                            <?php 
    $query ="SELECT city FROM city";
    $result = $con->query($query);
    if($result->num_rows> 0){
        while($optionData=$result->fetch_assoc()){
        $option =strtoupper($optionData['city']);
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
                                    <label><b style="color: #A44C13;">Destination<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="destination">
                            <option>-- Please select the Destination--</option>
    
                            <?php 
    $query ="SELECT city FROM city";
    $result = $con->query($query);
    if($result->num_rows> 0){
        while($optionData=$result->fetch_assoc()){
        $option =strtoupper($optionData['city']);
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
                               
                                </div>
            </div>
            <div class="invoice-section">
                            <label><b style="color: #A44C13;">INVOICE DETAILS<span style="color:red">*<span></b></label> <i class="fa fa-plus" id="ad" onclick="cre()"
   style="font-size:24px; float:right; cursor:pointer;"
   aria-hidden="true"></i>
                            <div class="container-fluid">
            <div class="row">
                <div class="col-lg-12">
                    <div class="card">
                        
                        <table id="wrap" class="responsive-table">
                      
    
     
                            <thead>
                                <tr style="color:#14BCA3">
                                    <th><center><b>Invoice No</b></center></th>
                                    <th><center><b>Invoice Value</b></center></th>
                                    <th><center><b>Invoice Date</b></center></th>
                                    <th><center><b>Part Number</b></center></th>
                                    <th><center><b>Eway Bill</b></center></th>
                                    <th><center><b>Quantity</b></center></th>
                                    <th></th>
                                </tr>

                            </thead>
                            <tbody>
                               <tr>
                                   <td data-label="Invoice No"> <input type="text" class="form-control" name="inv[]" /></td>
                                    <td data-label="Invoice Value"><input type="text" class="form-control" name="value[]" /></td>
                                    <td data-label="Invoice Date"><input type="date" class="form-control" name="dt[]" /></td>
                                    <td data-label="Part Number"><input type="text" class="form-control" name="part[]" /></td>
                                   <td data-label="Eway Bill"><input type="text" class="form-control" name="eway[]" /></td>
                                    <td data-label="Quantity"><input type="text" class="form-control" name="qty[]" /></th>
                                   <td><input type="hidden" id="box" name="box1" value="1"></td>
                                </tr>
                                
                            </tbody>
                            
                        </table>

                    </div>
                </div>
            </div>
        </div>
        </div>
        <div class="row clearfix">
            <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Box<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="box" placeholder="Enter the Box"  required/>
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Actual Weight<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="actual" placeholder="Enter the Actual Weight"  required/> 
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Charge Weight<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="charge" placeholder="Enter the Charge Weight"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-2" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color:#14BCA3"> Frieght Charge<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="fcharge" placeholder="Enter the Frieght Charge"  required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-2" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color:#14BCA3"> Awb Charge<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="acharge" placeholder="Enter the Awb Charge"  required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-2" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color:#14BCA3"> Pickup Charge<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="pcharge" placeholder="Enter the Pickup Charge"  required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-2" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color:#14BCA3"> Delivery Charge<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="dcharge" placeholder="Enter the Delivery Charge"  required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-2" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color:#14BCA3"> Packaging Charge<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="pacharge" placeholder="Enter the Package Charge"  required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-2" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color:#14BCA3"> Handling Charge<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="hcharge" placeholder="Enter the Handling Charge"  required/>                                    
                                    </div>
                                </div>
        <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Description<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="type" placeholder="Enter the Description"  required/>                                    
                                    </div>
                                  
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Insured By<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="insured">
                                        <option value="">-- Please select Insured By--</option>
                                        <option value="Client">Client</option>
                                        <option value="Transporter">Transporter</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Remarks<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="remarks" placeholder="Enter the Remarks"  required/>                                    
                                    </div>
                                </div>
                               
                                
                                
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                   <input type="text" class="form-control" name="clerk" value=<?php echo $t; ?> HIDDEN/>                                    
                                    </div>
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
{include('tables/booking_table.php');} ?>
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

    let form = document.getElementById("frm1");

    // ===== CHECK DROPDOWNS =====
    if (form.client.value === "" || form.client.value.includes("Please")) {
        alert("Please select Billed To (Client)");
        form.client.focus();
        return;
    }

    if (form.mode.value === "") {
        alert("Please select Mode");
        form.mode.focus();
        return;
    }

    if (form.consignor.value.includes("Please")) {
        alert("Please select Consignor");
        form.consignor.focus();
        return;
    }

    if (form.consignee.value.includes("Please")) {
        alert("Please select Consignee");
        form.consignee.focus();
        return;
    }

    if (form.origin.value.includes("Please")) {
        alert("Please select Origin");
        form.origin.focus();
        return;
    }

    if (form.destination.value.includes("Please")) {
        alert("Please select Destination");
        form.destination.focus();
        return;
    }

    // ===== CHECK DATE =====
    if (form.date.value === "") {
        alert("Please select Date");
        form.date.focus();
        return;
    }

    // ===== CHECK BOX & DESCRIPTION =====
  let box = document.getElementsByName("box")[0];

if (!box || box.value.trim() === "") {
    alert("Please enter Box");
    if (box) box.focus();
    return;
}

    if (form.type.value.trim() === "") {
        alert("Please enter Description");
        form.type.focus();
        return;
    }

    // ===== CHECK INVOICE TABLE =====
    let inv = document.getElementsByName("inv[]");
    let val = document.getElementsByName("value[]");
    let dt = document.getElementsByName("dt[]");
    let part = document.getElementsByName("part[]");
   
    let qty = document.getElementsByName("qty[]");

    for (let i = 0; i < inv.length; i++) {

        if (inv[i].value.trim() === "") {
            alert("Enter Invoice No in row " + (i + 1));
            inv[i].focus();
            return;
        }

        if (val[i].value.trim() === "") {
            alert("Enter Invoice Value in row " + (i + 1));
            val[i].focus();
            return;
        }

        if (dt[i].value === "") {
            alert("Select Invoice Date in row " + (i + 1));
            dt[i].focus();
            return;
        }

        if (part[i].value.trim() === "") {
            alert("Enter Part Number in row " + (i + 1));
            part[i].focus();
            return;
        }

       

        if (qty[i].value.trim() === "") {
            alert("Enter Quantity in row " + (i + 1));
            qty[i].focus();
            return;
        }
    }

    // ===== FINAL SUBMIT =====
    form.submit();
}

    </script> <script >
        function cre(){

            var b=jQuery("#box").val();
            b++;
            if(b<=10){
            jQuery("#box").val(b);
        jQuery("#wrap").append(' <tbody id="bloop'+b+'"><tr><td data-label="Invoice No"> <input type="text" class="form-control" name="inv[]" /></td><td data-label="Invoice Value"> <input type="text" class="form-control" name="value[]" /></td><td data-label="Invoice Date"><input type="date" class="form-control" name="dt[]" /></td><td data-label="Part Number"><input type="text" class="form-control" name="part[]" /></td><td data-label="Eway Bill"><input type="text" class="form-control" name="eway[]" /></td><td data-label="Quantity"><input type="text" class="form-control" name="qty[]" /></td><td> <button class="btn btn-success btn-icon float-right"  onclick=rmore("'+b+'") type="button"><i class="zmdi zmdi-minus"></i></button></td></tr> </tbody>');
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
    <?php include('header/footer.php'); ?>


