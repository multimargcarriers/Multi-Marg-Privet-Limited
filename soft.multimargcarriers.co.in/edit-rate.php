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
$query="select * from rates where pid=$v";
$result=mysqli_query($con,$query);
$row=mysqli_fetch_array($result);
$client=$row['client'];
$origin=$row['origin'];
$destination=$row['destination'];
$awb=$row['awb'];
$ar=$row['air_rate'];
$ap=$row['air_pickup'];
$ad=$row['air_delivery'];
$tr=$row['train_rate'];
$tp=$row['train_pickup'];
$td=$row['train_delivery'];
$rr=$row['road_rate'];
$rp=$row['road_pickup'];
$rd=$row['road_delivery'];
$re=$row['roadexpress_rate'];
$rep=$row['roadexpress_pickup'];
$red=$row['roadexpress_delivery'];
$code=$row['code'];
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
            <form class="login100-form validate-form" method="POST" id="frm1" action="edit/edit-rate.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            <h2 class="card-inside-title">Update Rate</h2>
                            <div class="row clearfix">
                            <div class="col-sm-12" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b>Client<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="clt" value="<?php echo $client;?>"  disabled/>                          
                                    </div>

                                </div>
                                <div class="col-sm-12" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <input type="text"  class="form-control" name="code" value="<?php echo $code;?>"  hidden/>                          
                                    </div>

                                </div>
                                
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Origin<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="ori" value="<?php echo $origin;?>"  disabled/>                         
                                    </div>
                                </div>
                                
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Destination<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="dest" value="<?php echo $destination;?>"  disabled/>    
                                    </div>
                                </div>
                               
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>AWB Charge<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="awb" value="<?php echo $awb;?>"  required/>                        
                                    </div>
                                </div>
                               
                                </div>
                            </div>
                    
                                <div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Air-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="ar" value="<?php echo $ar;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Air-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="ap" value="<?php echo $ap;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Air-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="ad" value="<?php echo $ad;?>"  required/>                        
                                    </div>
                                </div>
</div>
<div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Train-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="tr" value="<?php echo $tr;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Train-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="tp" value="<?php echo $tp;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Train-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="td" value="<?php echo $td;?>"  required/>                        
                                    </div>
                                </div>
</div>
<div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rr" value="<?php echo $rr;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rp" value="<?php echo $rp;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rd" value="<?php echo $rd;?>"  required/>                        
                                    </div>
                                </div>
</div>
<div class="row clearfix">
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road Express-Rate<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="re" value="<?php echo $re;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Pickup<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="rep" value="<?php echo $rep;?>"  required/>                        
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Road-Delivery<span style="color:red">*<span></b></label><input type="text"  class="form-control" name="red" value="<?php echo $red;?>"  required/>                        
                                    </div>
                                </div>
</div>

                                
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="UPDATE RATE" />                                 
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


