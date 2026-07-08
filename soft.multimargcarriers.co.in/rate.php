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
$query="select * from rates order by code desc limit 1";
                            $result=mysqli_query($con,$query);
                            $row=mysqli_fetch_array($result);
                            $last=$row['code'];
                            if($last=="")
                            {
                                $a="0001";
                            }
                            else
                            {

                                $a=intval($last);
                               
                                $a=$a+1;
                                $a = str_pad($a, 4, '0', STR_PAD_LEFT);
                            
                            }
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
            <form class="login100-form validate-form" method="POST" id="frm1" action="add/add-rate.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
               
                        <div class="body">
                            <h2 class="card-inside-title">Add Rate</h2>
                            <div class="row clearfix">
                            <div class="col-sm-12" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b>Client<span style="color:red">*<span></b></label>  <select class="form-control show-tick ms select2"  name="client">
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
                                
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Origin<span style="color:red">*<span></b></label><select class="form-control show-tick" name="origin">
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
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Destination<span style="color:red">*<span></b></label><select class="form-control show-tick" name="destination">
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
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>AWB Charge<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="awb" placeholder="Enter the Awb Charge"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                   <input type="text"  class="form-control" name="code" value=<?php echo $a;?> hidden/>                        
                                    </div>
                                </div>
                                </div>
                            </div>
                    
                                <div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Air-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="ar" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Air-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="ap" placeholder="Enter the Pickup Charge"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Air-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="ad" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
</div>
<div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Train-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="tr" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Train-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="tp" placeholder="Enter the Pickup Charge"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Train-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="td" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
</div>
<div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rr" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rp" placeholder="Enter the Pickup Charge"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rd" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
</div>
<div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road Express-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="re" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road Express-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rep" placeholder="Enter the Pickup Charge"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road Express-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="red" placeholder="Enter the Rate"  required/>                        
                                    </div>
                                </div>
</div>

                                
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="ADD RATE" />                                 
                                    </div>
                                </div></center>
</div>
</div>
</div>

</form>   

<?php include('tables/rate_table.php'); ?>
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


