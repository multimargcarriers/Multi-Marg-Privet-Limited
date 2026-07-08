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
            <form class="login100-form validate-form" method="POST" id="frm1" action="add/add-city.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
        
                        <div class="body">
                            <h2 class="card-inside-title">Add City</h2>
                            <div class="row clearfix">
                            <div class="col-sm-6" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b>City Name<span style="color:red">*<span></b></label> <input type="text"  class="form-control" name="city" placeholder="Enter City"  required/>
                                    </div>

                                </div>
                                
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Abbreviation<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="short" placeholder="Enter Short Name" required />                                    
                                    </div>
                                </div>
                                </div>
                            </div>
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="ADD CITY" />                                 
                                    </div>
                                </div></center>
</div>

</div>
</div>
</form>   

<?php include('tables/city_table.php'); ?>
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


