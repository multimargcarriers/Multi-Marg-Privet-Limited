<?php
// Start the session before any output
session_start();
include('config.php');
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}
include('header/header.php');
$v=$_GET['code'];
$query="select * from vendor where pid=$v";
$result=mysqli_query($con,$query);
$row=mysqli_fetch_array($result);
$code=$row['code'];
$vendor=$row['vendor'];
$gst=$row['gst'];
$phno=$row['phno'];
$branch=$row['branch'];
$mode=$row['mode'];
$address=$row['address'];
$name=$row['name'];
$email=$row['email'];
?>
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
            <form class="login100-form validate-form" method="POST" id="frm1" action="edit/edit-vendor.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                   
                        <div class="body">
                            <h2 class="card-inside-title">Update Vendor</h2>
                            <div class="row clearfix">
                           
                                
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Vendor Code</b></label> <input type="text" class="form-control" name="code" value=<?php echo $code;?> disabled />                                    
                                    </div>
                                </div>
                                
                                <div class="col-sm-6" data-validate = "Phno is required">
                                    <div class="form-group">                                    
                                    <label><b>Vendor Name<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="vendor" value="<?php echo $vendor;?>"  required/>                                   
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b>GST<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="gst" value="<?php echo $gst;?>" required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b>Branch<span style="color:red">*<span></b></label>   <select class="form-control show-tick ms select2"  name="branch">
                            <option value="<?php echo $branch; ?>"><?php echo $branch;?></option>
    
                            <?php 
    $query ="SELECT branch FROM branch";
    $result = $con->query($query);
    if($result->num_rows> 0){
        while($optionData=$result->fetch_assoc()){
        $option =strtoupper($optionData['branch']);
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
                                    <label><b>Mode<span style="color:red">*<span></b></label> <select class="form-control show-tick" name="mode">
                                        <option value="<?php echo $mode; ?>"><?php echo $mode; ?></option>
                                        <option value="Air">Air</option>
                                        <option value="Train">Train</option>
                                        <option value="Road">Road</option>
                                        <option value="Local Tempo">Local Tempo</option>
                                        </select>                               
                                    </div>
                                </div>

                                <div class="col-sm-12">
                                    <div class="form-group">
                                        <div class="form-line">

                                        <label><b>Address<span style="color:red">*<span></b></label> <textarea rows="4" name="address" class="form-control no-resize"><?php echo $address;?> </textarea>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b>Contact Person<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="name" value="<?php echo $name;?>"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b>Phone Number<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="phno" value="<?php echo $phno;?>"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b>Email<span style="color:red">*<span></b></label>  <input type="email" class="form-control" name="email" value="<?php echo $email;?>"  required/>                                    
                                    </div>
                                </div>
                                </div>
                            </div>
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="UPDATE VENDOR" />                                 
                                    </div>
                                </div></center>
</div>
</div>
</div>

</form>   

<?php include('tables/vendor_table.php'); ?>
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

    </script>
    <?php include('header/footer.php'); ?>


