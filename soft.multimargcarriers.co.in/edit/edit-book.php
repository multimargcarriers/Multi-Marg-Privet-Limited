
<?php  
include ('../config.php');
if($_SERVER['REQUEST_METHOD']=="POST"){
  $consignment=$_POST['awb'];
    $date=$_POST['date'];
    $mode=$_POST['mode'];
    $client=$_POST['client'];
    $origin=$_POST['origin'];
    $destination=$_POST['destination'];
    $consignor=$_POST['consignor'];
    $consignee=$_POST['consignee'];
    $tob=$_POST['description'];
    $insured=$_POST['insured'];
   
    $remarks=$_POST['remarks'];
    $clerk=$_POST['clerk'];
    $box=$_POST['box'];
$aweight=$_POST['actual'];
$cweight=$_POST['charge'];
$frieght=$_POST['fcharge'];
$awbcharge=$_POST['acharge'];
$pickup=$_POST['pcharge'];
$delivery=$_POST['dcharge'];
$packaging=$_POST['pacharge'];
$handling=$_POST['hcharge'];
    $bo=$_POST['box1'];
if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$sql="UPDATE trip SET date='$date',mode='$mode',client='$client',origin='$origin',destination='$destination',box='$box',actual_wt='$aweight',charge_wt='$cweight',type_of_delivery='$tob',frieght_charge='$frieght',awb_charge='$awbcharge',pickup_charge='$pickup',delivery_charge='$delivery',packaging_charge='$packaging',handling_charge='$handling',insured='$insured',remarks='$remarks',clerk_name='$clerk',consignor='$consignor',consignee='$consignee' WHERE awb='$consignment'";
if ($con->query($sql) == TRUE) {
  $result=mysqli_query($con,$sql) or die(mysqli_error($con));
if($result)
{
  $add=0;
	$u_id=$con->insert_id;
	for($i=0;$i<$bo;$i++)
	{
    $pid=$_POST['pid'][$i];
		$lr=$_POST['inv'][$i];
		$dt=$_POST['dt'][$i];
		$value=$_POST['value'][$i];
    	$part=$_POST['part'][$i];
      	$eway=$_POST['eway'][$i];
		$qty=$_POST['qty'][$i];
		
		
    $sql12="UPDATE lr_details SET invoice='$lr',invdate='$dt',value='$value',part='$part',eway='$eway',quantity='$qty' WHERE awb='$consignment' and pid='$pid'";
if ($con->query($sql12) == TRUE) {
$add++;

  
} else {
  echo "Error updating record: " . $con->error;
}
  }
 
  if($add==$bo)
  {
    echo "<script type='text/javascript'>alert('DATA UPDATED SUCCESFULLY');window.location= '../book.php'</script>";
  }

}
}
}

}



?>
