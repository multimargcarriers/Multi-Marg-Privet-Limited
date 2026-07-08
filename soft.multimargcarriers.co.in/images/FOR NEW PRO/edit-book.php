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
$query="select * from trip where pid=$v";
$result=mysqli_query($con,$query);
$row=mysqli_fetch_array($result);
$consignment=$row['awb'];
$dispatch_date=$row['date'];
$mode=$row['mode'];
$client=$row['client'];
$origin=strtoupper($row['origin']);
$destination=strtoupper($row['destination']);
$typeofdelivery=$row['type_of_delivery'];
$insured=$row['insured'];
$box=$row['box'];
$aweight=$row['actual_wt'];
$cweight=$row['charge_wt'];
$remarks=strtoupper($row['remarks']);
$consignor=strtoupper($row['consignor']);
$consignee=strtoupper($row['consignee']);
$description=strtoupper($row['description']);
$remarks=strtoupper($row['remarks']);
$clerk=strtoupper($row['clerk_name']);
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
      <form class="login100-form validate-form" method="POST" id="frm1" action="edit/edit-book.php">
      <div class="row clearfix">
          <div class="col-lg-12 col-md-12 col-sm-12">
              
              
                  <div class="body">
                      <h2 class="card-inside-title" style="color: #6526D2;">Edit Booking</h2>
                      <div class="row clearfix">
                      <div class="col-sm-6" data-validate = "Employee Name is required">
                              <div class="form-group">                                    
                              <label><b style="color: #A44C13;">Awb No</b></label> <input type="text"  class="form-control" name="awb" value="<?php echo $consignment;?>" disabled />  <input type="text"  class="form-control" name="awb" value="<?php echo $consignment;?>" hidden />
                              </div>

                          </div>
                          <div class="col-sm-6" data-validate = "Branch is required">
                              <div class="form-group">                                   
                               <label><b>Billed To<span style="color:red">*<span></b></label> <select class="form-control show-tick "  name="client">
                            <option value="<?php echo $client;?>"><?php echo $client;?></option>
    
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
                              <label><b  style="color: #A44C13;">Date<span style="color:red">*<span></b></label>  <input type="date" class="form-control" name="date"  value="<?php echo $dispatch_date;?>" required/>                                    
                              </div>
                          </div>
                          <div class="col-sm-6" >
                          <div class="form-group">  
                          <label><b  style="color: #A44C13;">Mode<span style="color:red">*<span></b></label><select class="form-control show-tick" name="mode">
                                  <option value="<?php echo $mode;?>"><?php echo $mode;?></option>
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
                            <option value="<?php echo $consignor;?>"><?php echo $consignor;?></option>
    
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
                             <option value="<?php echo $consignee;?>"><?php echo $consignee;?></option>
    
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
                              <label><b style="color: #A44C13;"> Origin<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="origin" value="<?php echo $origin;?>"  required/>                                    
                              </div>
                          </div>
                          <div class="col-sm-6" data-validate = "Gst No is required">
                              <div class="form-group">                                   
                              <label><b style="color: #A44C13;">Destination<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="destination" value="<?php echo $destination;?>"  required/>                                    
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
                            <?php
$v1=$consignment;
$query1 = mysqli_query( $con, "SELECT * FROM lr_details where awb='$v1'" ) or die(mysqli_error($con));
if(! $query1 ) {
    die('Could not get data: ' . mysql_error());
 }
 $a=0;$c=0;
 
 while($row1=mysqli_fetch_array($query1)) {
    $c++;
echo '<tr><th><input type="text" class="form-control" name="inv[]" value="'.$row1['invoice'].'"/></th>
<th><input type="text" class="form-control" name="value[]" value="'.$row1['value'].'"/></th>
<th><input type="date" class="form-control" name="dt[]" value="'.$row1['invdate'].'"/></th>
<th><input type="text" class="form-control" name="part[]" value="'.$row1['part'].'"/></th>
<th><input type="text" class="form-control" name="eway[]" value="'.$row1['eway'].'"/></th>

<th><input type="text" class="form-control" name="qty[]" value="'.$row1['quantity'].'"/></th>


  <th><input type="hidden" class="form-control" name="pid[]" value="'.$row1['pid'].'"></th>
';

 }
 echo ' <th><input type="hidden" id="box" name="box1" value="'.$c.'"></th></tr>';
?>
                          
                      </tbody>
                      
                  </table>

              </div>
          </div>
      </div>
  </div>
  <div class="row clearfix">
     <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Box<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="box" value="<?php echo $box;?>"  required/>
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Actual Weight<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="actual" value="<?php echo $aweight;?>"  required/> 
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Charge Weight<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="charge" value="<?php echo $cweight;?>"  required/>                                    
                                    </div>
                                </div>
  <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Type of Delivery<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="type">
                                       <option value="<?php echo $typeofdelivery;?>"><?php echo $typeofdelivery;?></option>
                                        <option value="Normal">Normal</option>
                                        <option value="Special">Special</option>
                                        <option value="Part Load">Part Load</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;">Insured By<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="insured">
                                       <option value="<?php echo $insured;?>"><?php echo $insured;?></option>
                                        <option value="Client">Client</option>
                                        <option value="Owner">Owner</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-sm-4" data-validate = "Gst No is required">
                                    <div class="form-group">                                   
                                    <label><b style="color: #A44C13;"> Description<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="description" value="<?php echo $description;?>"  required/>                                    
                                    </div>
                                </div>
                               
                                
                    
                          <div class="col-sm-6" data-validate = "Gst No is required">
                              <div class="form-group">                                   
                              <label><b style="color: #A44C13;"> Remarks<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="remarks" value="<?php echo $remarks;?>"  required/>                                    
                              </div>
                          </div>
                          <div class="col-sm-6" data-validate = "Gst No is required">
                              <div class="form-group">                                   
                              <label><b style="color: #A44C13;">Clerks'Name<span style="color:red">*<span></b></label>  <input type="text" class="form-control" name="clerk" value="Dharmendra Puri"  required/>                                    
                              </div>
                          </div>
                          </div>
                      <center><div class="col-sm-6">
                              <div class="form-group">                                   
                              <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="UPDATE BOOKING" />                                 
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

    </script>
    <script >
        function cre(){

            var b=jQuery("#box").val();
            b=0;
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
    <?php include('header/footer.php'); ?>


