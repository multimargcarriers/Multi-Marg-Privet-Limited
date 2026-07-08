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
            <form class="login100-form validate-form" method="POST" id="frm1" action="add-cash.php" enctype="multipart/form-data">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            
                            <h2 class="card-inside-title" style="color: #6526D2;">Cash sheet</h2>
                            <div class="row clearfix">
                              <div class="col-sm-6" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Amount<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="amount" id="amount" placeholder="Enter the amount"  />
                                </div>
                              </div>
                              
                            <div class="col-sm-6" data-validate = "Branch is required">
                                <div class="form-group">  
                                  <label><b style="color: #A44C13;">Date<span style="color:red">*<span></b></label> <input type="date" class="form-control" name="date" id="date"   />
                                </div>
                            </div>
                          
<div class="col-sm-6" data-validate = "Branch is required">
                                <div class="form-group">  
                                  <label><b style="color: #A44C13;">Cash In/Out<span style="color:red">*<span></b></label> <select class="form-control show-tick" name="cash" >
                                        <option value=""  style="background-COLOR: WHITE; COLOR:#a40505;">-- Please select the option--</option> 
                                        <option value="IN" >CASH IN</option>
<option value="OUT" >CASH OUT</option>

                                    </select>
                                </div>
                                 </div>
                             <div class="col-sm-6" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Remarks<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="remarks" id="awb_no" placeholder="Enter the Remarks if any...."  />
                                </div>
                              </div>
                               <div class="col-sm-12" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Upload Voucher<span style="color:red">*<span></b></label>  <input type="file"  name="voucher" accept=".pdf, image/jpeg, image/png" required/>                                    
                                    </div>
                                </div>
                              </div>
                               <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="UPDATE CASH SHEET" />                                 
                                    </div>
                                </div></center>
<script>
    function submitForm() {
        // Using the native form submit method
        document.getElementById("frm1").submit();
    }

    </script>

<?php include('header/footer.php'); ?>