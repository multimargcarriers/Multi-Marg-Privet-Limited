<div class="container-fluid">
<div class="table-responsive">
<div class="col-sm-12">
    <form class="login100-form validate-form" method="POST" id="frm1" >
        <div class="row clearfix">
            <div class="col-sm-12" data-validate = "Branch is required">
                                    <div class="form-group">                                    
                                    <label><b>CLIENT</b></label>   <select class="form-control show-tick "  name="client">
                            <option></option>
    
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
                                    <label><b>FROM DATE</b></label>  <input type="date" class="form-control" name="fr" />                                    
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                 
                                    <label><b>TO DATE</b></label>  <input type="date" class="form-control" name="to"  />                                    
                                    </div>
                                </div>
                                </div>
                                 <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                         <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="myfc()" value="SEARCH" />                                   
                                    </div>
                                </div></center>

                                </form>
                                 <?php
   $fr=0;$to=0;$client="";
if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
                                $fr=$_POST['fr'];
                                $to=$_POST['to'];
                             $client=$_POST['client'];
                              
}         ?>
                                    <div class="form-group">                                   
                                    <a href="exports/unbilled_export.php?from=<?php echo $fr;?>&to=<?php echo $to;?>&client=<?php echo $client;?>"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="UNBILLED REPORT" />  </a>                               
                                    </div>
                                </div>
                                    <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>Awb No</th>
                                                <th>Date</th>
                                                <th>Consignor</th>
                                                <th>Consignee</th>
                                                <th>Origin</th>
                                                <th>Destination</th>
                                                <th>Mode</th>
                                                <th>Box</th>
                                                <th>Chargeable Weight</th>
                                                
                                                
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                            <?php

  
$fr = mysqli_real_escape_string($con, $fr);
$to = mysqli_real_escape_string($con, $to);
$client = mysqli_real_escape_string($con, $client);

if (!empty($fr) && !empty($to) && !empty($client)) {
   
    $retval = mysqli_query($con, "SELECT * FROM trip where client='$client' and date between '$fr' AND '$to' and status=0 ORDER BY awb DESC");
}
elseif (!empty($fr) && !empty($to) && empty($client)) {
    
    $retval = mysqli_query($con, "SELECT * FROM trip where date between '$fr' AND '$to' and status=0 ORDER BY awb DESC");
}
elseif (empty($fr) && empty($to) && !empty($client)) {
   
    $retval = mysqli_query($con, "SELECT * FROM trip where client='$client' and status=0 ORDER BY awb DESC");
}
// Fetch all trip records
else
{
$retval = mysqli_query($con, "SELECT * FROM trip where status=0 ORDER BY pid DESC");
}

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row=mysqli_fetch_array($retval)) {
   $consig=$row['awb'];
                                             echo "<tr><td>".$row['awb']."</td> <td>".date("d-m-Y", strtotime($row['date']))."</td><td>".$row['consignor']."</td><td>".$row['consignee']."</td><td>".strtoupper($row['origin'])."</td><td>".strtoupper($row['destination'])."</td><td>".strtoupper($row['mode'])."</td>" ;  
                                            
                                              $retval1 = mysqli_query( $con, "SELECT * FROM trip where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                echo $row1['box']."<br>";
                                                
                                             }
                                             echo "</td>"; 
                                              
                                             $retval1 = mysqli_query( $con, "SELECT * FROM trip where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                echo $row1['charge_wt']."<br>";
                                                
                                             }
                                             echo "</td>";

                                               

                                               
}?>
                                            
                                            </tbody>
                                       
                                    </table>
                        </div>
                        </div>
                        <script>
function myConfirm(a){    
    var result = confirm("Are you really want to delete this item?");
    if(result){
        window.location.href ='delete/deletebook.php?vat='+a;
    }
}
</script> <script>
    function myfc() {
  document.getElementById("frm1").submit();
}
    </script>