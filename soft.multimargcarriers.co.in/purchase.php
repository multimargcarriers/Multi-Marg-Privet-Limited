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
            <form class="login100-form validate-form" method="POST" id="frm1" action="add-purchase.php" enctype="multipart/form-data">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            
                            <h2 class="card-inside-title" style="color: #6526D2;">Purchase Bills</h2>
                            <div class="row clearfix">
                                <div class="col-sm-6" data-validate = "Branch is required">
                                <div class="form-group">  
                                  <label><b style="color: #A44C13;">Vendor Name<span style="color:red">*<span></b></label><select class="form-control show-tick "  name="vendor">
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
                                  <div class="col-sm-6" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Vendor Bill No<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="bill" id="bill" placeholder="Enter the Bill No"  />
                                </div>
                              </div>
                               <div class="col-sm-6" data-validate = "Branch is required">
                                <div class="form-group">  
                                  <label><b style="color: #A44C13;">Date<span style="color:red">*<span></b></label> <input type="date" class="form-control" name="date" id="date"   />
                                </div>
                            </div>
                              <div class="col-sm-6" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Taxable Value<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="taxable" id="taxable" placeholder="Enter the Taxable Value"  />
                                </div>
                              </div>
                               <div class="col-sm-6" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Gst<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="gst" id="gst" placeholder="Enter the Gst"  />
                                </div>
                              </div>
                               <div class="col-sm-6" data-validate = "Employee Name is required">
                                <div class="form-group">   
                                  <label><b style="color: #A44C13;">Total<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="total" id="total" placeholder="Enter the Total amount"  />
                                </div>
                              </div>
                           
                          

                            
                               <div class="col-sm-12" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Upload Bill<span style="color:red">*<span></b></label>  <input type="file"  name="billupload" accept=".pdf, image/jpeg, image/png" required/>                                    
                                    </div>
                                </div>
                              </div>
                               <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="UPDATE PURCHASE SHEET" />                                 
                                    </div>
                                </div></center>
<script>
    function submitForm() {
        // Using the native form submit method
        document.getElementById("frm1").submit();
    }

    </script>


<?php include('header/footer.php'); ?>