<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$awb=$_POST['awb'];
$date=$_POST['date'];
$mode=$_POST['mode'];
$client=$_POST['client'];
$origin=$_POST['origin'];
$destination=$_POST['destination'];
$consignor=$_POST['consignor'];
$consignee=$_POST['consignee'];
$tob=$_POST['type'];
$insured=$_POST['insured'];

$remarks=$_POST['remarks'];
$clerk=$_POST['clerk'];
$box=$_POST['box'];
$aweight=$_POST['actual'];
$cweight=$_POST['charge'];
$fcharge=$_POST['fcharge'];
$acharge=$_POST['acharge'];
$pcharge=$_POST['pcharge'];
$dcharge=$_POST['dcharge'];
$pacharge=$_POST['pacharge'];
$hcharge=$_POST['hcharge'];
$bo=$_POST['box1'];


if( !empty($awb) || !empty($date) || !empty($mode) || !empty($client) || !empty($origin)  || !empty($destination) || !empty($consignor)|| !empty($oconsignee) || !empty($tob) || !empty($insured)  || !empty($remarks) || !empty($clerk)|| !empty($box)|| !empty($aweight)|| !empty($cweight))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM trip WHERE awb=$awb";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../book.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO trip (pid,awb,date,mode,client,origin,destination,consignor, consignee, type_of_delivery, insured, remarks,clerk_name,box,actual_wt,charge_wt,frieght_charge,awb_charge,pickup_charge,delivery_charge,packaging_charge,handling_charge) VALUES('0','$awb','$date','$mode','$client','$origin','$destination','$consignor','$consignee','$tob','$insured','$remarks','$clerk','$box','$aweight','$cweight','$fcharge','$acharge','$pcharge','$dcharge','$pacharge','$hcharge')";
#execute above sql
$result=mysqli_query($con,$sql) or die(mysqli_error($con));
if($result)
{
	$u_id=$con->insert_id;
	for($i=0;$i<$bo;$i++)
	{
		$inv=$_POST['inv'][$i];
		$dt=$_POST['dt'][$i];
		$value=$_POST['value'][$i];
		$part=$_POST['part'][$i];
		$eway=$_POST['eway'][$i];
		
		$qty=$_POST['qty'][$i];
		
		if(empty($inv))
		{
			$inv=0;
		}
		if(empty($dt))
		{
			$dt=0;
		}
		if(empty($value))
		{
			$value=0;
		}
		if(empty($part))
		{
			$part=0;
		}
		if(empty($eway))
		{
			$eway=0;
		}
		if(empty($box))
		{
			$box=0;
		}
		if(empty($qty))
		{
			$qty=0;
		}
		if(empty($aweight))
		{
			$aweight=0;
		}
		if(empty($cweight))
		{
			$cweight=0;
		}
		if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
		$sq="INSERT INTO lr_details (awb,value,invdate,invoice,part,eway,quantity) values ('$awb','$value','$dt','$inv','$part','$eway','$qty')";
	
$exec=mysqli_query($con,$sq) or die(mysqli_error($con));
if($exec==1)
{
		$sql1="INSERT INTO track (pid,awb,status,remarks,date,location) VALUES(0,'$awb','SHIPMENT BOOKED','PICKUP DONE','$date','$origin')";
	$exec1=mysqli_query($con,$sql1) or die(mysqli_error($con));
if($exec1==1)
{
	echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../book.php'</script>";
#	header('location:book.php');
}
 
}	
	}
}
	
	
}

}
}
}
}


else
{ 
echo "All fields are required.";
die();
}
?>
