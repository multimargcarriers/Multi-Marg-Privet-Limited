<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$client=$_POST['client'];
$origin=$_POST['origin'];
$destination=$_POST['destination'];
$awb=$_POST['awb'];
$ar=$_POST['ar'];
$ap=$_POST['ap'];
$ad=$_POST['ad'];
$tr=$_POST['tr'];
$tp=$_POST['tp'];
$td=$_POST['td'];
$rr=$_POST['rr'];
$rp=$_POST['rp'];
$rd=$_POST['rd'];
$code=$_POST['code'];
echo $ar;
echo $tr;
echo $rr;
if( !empty($client) || !empty($origin) || !empty($destination) || !empty($awb) || !empty($ar)  || !empty($ap) || !empty($ad)|| !empty($tr) || !empty($tp)|| !empty($td)|| !empty($rr) || !empty($rp)|| !empty($rd))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM client WHERE code='$code'";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../rate.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO rates (pid,code,client,origin,destination,awb,air_rate,air_pickup,air_delivery,train_rate,train_pickup,train_delivery,road_rate,road_pickup,road_delivery) VALUES('0','$code','$client','$origin','$destination','$awb','$ar','$ap','$ad','$tr','$tp','$td','$rr','$rp','$rd')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{
	
echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../rate.php'</script>";

 
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
