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

                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                   <label><b  style="color: #A44C13;">Billed To<span style="color:red">*<span></b></label>  <select class="form-control show-tick"  name="client">
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
                                        <option value="Local Tempo">Local Tempo</option>
                                        </select>
                                </div>
</div>
                                <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Consignor<span style="color:red">*<span></b></label>  <select class="form-control show-tick "  name="consignor">
                            <option>-- Please select the Consignor--</option>
    
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
                                              
                                  <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Consignee<span style="color:red">*<span></b></label>  <select class="form-control show-tick "  name="consignee">
                            <option>-- Please select the Consignee--</option>
    
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
                            <label><b style="color: #A44C13;">INVOICE DETAILS<span style="color:red">*<span></b></label>
                            <div class="container-fluid">
            <div class="row">
                <div class="col-lg-12">
                    <div class="card">
                        
                        <table id="wrap" >
                        <col style="width:20%">
	<col style="width:20%">
	<col style="width:15%">
    <col style="width:20%">
	<col style="width:20%">
	<col style="width:15%">
    
     
                            <thead>
                                <tr style="color:#14BCA3">
                                    <th><center><b>Invoice No</b></center></th>
                                    <th><center><b>Invoice Value</b></center></th>
                                    <th><center><b>Invoice Date</b></center></th>
                                    <th><center><b>Part Number</b></center></th>
                                    <th><center><b>Eway Bill</b></center></th>
                                    <th><center><b>Quantity</b></center></th>
                                    <th><i style="font-size:24px" class="fa" id="ad" onclick="cre()" type="button">&#xf067;</i></th>
                                </tr>

                            </thead>
                            <tbody>
                               <tr>
                                    <th> <input type="text" class="form-control" name="inv[]" /></th>
                                    <th><input type="text" class="form-control" name="value[]" /></th>
                                    <th><input type="date" class="form-control" name="dt[]" /></th>
                                    <th><input type="text" class="form-control" name="part[]" /></th>
                                    <th><input type="text" class="form-control" name="eway[]" /></th>
                                    <th><input type="text" class="form-control" name="qty[]" /></th>
                                   <th><input type="hidden" id="box" name="box1" value="1"></th>
                                </tr>
                                
                            </tbody>
                            
                        </table>

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
        <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Type of Delivery<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="type">
                                        <option value="">-- Please select the Type--</option>
                                        <option value="Normal">Normal</option>
                                        <option value="Special">Special</option>
                                        <option value="Part Load">Part Load</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Insured By<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="insured">
                                        <option value="">-- Please select Insured By--</option>
                                        <option value="Client">Client</option>
                                        <option value="Owner">Owner</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Remarks<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="remarks" placeholder="Enter the Remarks"  required/>                                    
                                    </div>
                                </div>
                               
                                
                                
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Clerks'Name<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="clerk"   required/>                                    
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

<?php include('tables/booking_table.php'); ?>
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
            if(b<=10){
            jQuery("#box").val(b);
        jQuery("#wrap").append('<tbody id="bloop'+b+'"><tr><th> <input type="text" class="form-control" name="inv[]" /></th><th> <input type="text" class="form-control" name="value[]" /></th><th><input type="date" class="form-control" name="dt[]" /></th><th><input type="text" class="form-control" name="part[]" /></th><th><input type="text" class="form-control" name="eway[]" /></th><th><input type="text" class="form-control" name="qty[]" /></th><th> <button class="btn btn-success btn-icon float-right"  onclick=rmore("'+b+'") type="button"><i class="zmdi zmdi-minus"></i></button></th></tr> </tbody>');
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


