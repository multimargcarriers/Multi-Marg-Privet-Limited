<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$trip=$_POST['trip'];
$pid=$_POST['pid'];
$date=$_POST['date'];
$vtype=$_POST['vtype'];
$vno=$_POST['vehicleno'];
$driver=$_POST['driver'];
$vendor=$_POST['vendor'];
$origin=$_POST['origin'];
$destination=$_POST['destination'];
$remarks=$_POST['remarks'];
$bo=$_POST['box1'];


if( !empty($trip) || !empty($date) || !empty($vtype) || !empty($vno) || !empty($origin)  || !empty($destination) || !empty($driver) || !empty($vendor)  || !empty($remarks) )
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM tripsheet WHERE trip=$trip";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../tripsheet.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO tripsheet (pid,trip,date,vtype,vno,origin,destination,driver, vendor, instruction) VALUES('0','$trip','$date','$vtype','$vno','$origin','$destination','$driver','$vendor','$remarks')";
#execute above sql
$result=mysqli_query($con,$sql) or die(mysqli_error($con));
if($result)
{
	$u_id=$con->insert_id;
	for($i=0;$i<$bo;$i++)
	{
		$lr=$_POST['lr'][$i];
		$consignor=$_POST['consignor'][$i];
		$consignee=$_POST['consignee'][$i];
		$client=$_POST['client'][$i];
		$box=$_POST['box'][$i];
		$inv=$_POST['inv'][$i];
		$eway=$_POST['eway'][$i];
		$btype=$_POST['booking_type'][$i];
		$weight=$_POST['weight'][$i];
		$ptype=$_POST['payment_type'][$i];
$amount=$_POST['amount'][$i];
		
		if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
		$sq="INSERT INTO material_details (pid,trip,lr,consignor,consignee,client,box,weight,inv,eway,booking_type,amount,payment_type) values (0,'$trip','$lr','$consignor','$consignee','$client','$box','$weight','$inv','$eway','$btype','$amount','$ptype')";
	
$exec=mysqli_query($con,$sq) or die(mysqli_error($con));
if($exec==1)
{
		
if ($t == "Operation Team") {
    $nextPid = $pid + 1;
    
    echo "<script type='text/javascript'>
            alert('DATA SAVED SUCCESSFULLY');
            window.location.href = '../tripmanifest.php?code" . urlencode($nextPid) . "';
          </script>";
} else {
    echo "<script type='text/javascript'>
            alert('DATA SAVED SUCCESSFULLY');
            window.location.href = '../tripsheet.php';
          </script>";
}
#	header('location:book.php');
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
