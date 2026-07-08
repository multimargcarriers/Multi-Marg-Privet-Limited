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
            <form class="login100-form validate-form" method="POST" id="frm1" action="upload.php" enctype="multipart/form-data">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
                    
                    
                        <div class="body">
                            
                            <h2 class="card-inside-title" style="color: #6526D2;">Miscellaneous Invoices</h2>
                            <div class="row clearfix">
                            <div class="col-sm-4" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b style="color: #A44C13;">Invoice Prefix<span style="color:red">*<span></b></label> <select class="form-control show-tick" name="prefix">
                                        <option value="MCPL/25-26/">MCPL/25-26/</option>
                                        <option value="MCPL/26-27/">MCPL/26-27/</option>
                                        <option value="MCPL/27-28/">MCPL/27-28/</option>
                                        <option value="MCPL/28-29/">MCPL/28-29/</option>
                                        <option value="MCPL/29-30/">MCPL/29-30/</option>
                                        </select>  
                                    </div>

                                </div>
                                <div class="col-sm-4" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Invoice No<span style="color:red">*<span></b></label> <input type="text"  class="form-control" name="invoice_no" placeholder="Enter Invoice No" required /> 
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Invoice Date<span style="color:red">*<span></b></label>  <input type="date" class="form-control" name="invoice_date"  required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-12" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Client<span style="color:red">*<span></b></label>  <select class="form-control show-tick"  name="client">
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
                                <div class="col-sm-4" >
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
<div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Origin<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="origin" placeholder="Enter the Origin" required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Destination<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="destination" placeholder="Enter the Destination" required/>                                    
                                    </div>
                                </div>
                                <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Total Frieght<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="frieght" placeholder="Enter the Frieght" required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Total Awb Charge<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="awb_charge" placeholder="Enter the Awb Charge" required/>                                    
                                    </div>
                                </div>
                                 <div class="col-sm-3" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Total Other Charges<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="others" placeholder="Enter the Other Charges" required/>                                    
                                    </div>
                                </div>
                                  <div class="col-sm-3" >
                                <div class="form-group">  
                                <label><b  style="color: #A44C13;">GST<span style="color:red">*<span></b></label><select class="form-control show-tick" name="gst">
                                        <option value="">Please select if GST is applicable or not</option>
                                        <option value="YES">YES</option>
                                        <option value="NO">NO</option>
                                       </select>
                                </div>
</div>
                                <div class="col-sm-12" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b  style="color: #A44C13;">Upload Invoice<span style="color:red">*<span></b></label>  <input type="file"  name="pdffile" accept="application/pdf" required/>                                    
                                    </div>
                                </div>
                                </div>
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="UPLOAD" name="uploadBtn"/>                                 
                                    </div>
                                </div></center>
</div>
</div>
</div>

</form>  
<?php include('tables/miscellaneous_table.php'); ?>


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

    </script>  <script>
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

    <?php 
     include('header/footer.php'); ?>


