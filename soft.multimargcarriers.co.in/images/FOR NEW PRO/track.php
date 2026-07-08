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
            
    <div class="row">
      
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
            <div class="container-fluid">
            <!-- Input -->
            <form class="login100-form validate-form" method="POST" id="frm1" action="add/add-track.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            
                            <h2 class="card-inside-title" style="color: #6526D2;">Tracking</h2>
                            <div class="row clearfix">
                              <div class="col-sm-6" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Awb No<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="awb_no" id="awb_no" placeholder="Enter the AWB No."  />
                                </div>
                              </div>
                            <div class="col-sm-6" data-validate = "Branch is required">
                                <div class="form-group">  
                                  <label><b style="color: #A44C13;">Date<span style="color:red">*<span></b></label> <input type="date" class="form-control" name="date" id="date"   />
                                </div>
                            </div>
                            <div class="col-sm-6" data-validate = "Branch is required">
                                <div class="form-group">  
                                  <label><b style="color: #A44C13;">Location<span style="color:red">*<span></b></label> <select class="form-control show-tick"  name="location">
                            <option>-- Please select the Location--</option>
    
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
<div class="col-sm-6" data-validate = "Branch is required">
                                <div class="form-group">  
                                  <label><b style="color: #A44C13;">Status<span style="color:red">*<span></b></label> <select class="form-control show-tick" name="status" >
                                        <option value=""  style="background-COLOR: WHITE; COLOR:#a40505;">-- Please select the Status--</option> 
                                        <option value="DEPARTED" >DEPARTED</option>
<option value="IN TRANSIT" >IN TRANSIT</option>
<option value="ARRIVED" >ARRIVED</option>
<option value="DISPATCHED" >DISPATCHED</option>
<option value="OUT FOR DELIVERY" >OUT FOR DELIVERY</option>
<option value="DELIVERED" >DELIVERED</option>
<option value="OFFLOADED" >OFFLOADED</option>
<option value="OVER-CARRIED" >OVER-CARRIED</option>
                                    </select>
                                </div>
                                 </div>
                             <div class="col-sm-12" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Remarks<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="remarks" id="awb_no" placeholder="Enter the Remarks if any...."  />
                                </div>
                              </div>
                              </div>
                               <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="UPDATE STATUS" />                                 
                                    </div>
                                </div></center>
<script>
    function submitForm() {
        // Using the native form submit method
        document.getElementById("frm1").submit();
    }

    </script>

<?php include('header/footer.php'); ?>