<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$code=$_POST['code'];
$vendor=$_POST['vendor'];
$gst=$_POST['gst'];
$mode=$_POST['mode'];
$branch=$_POST['branch'];
$name=$_POST['name'];
$address=$_POST['address'];
$phno=$_POST['phno'];
$email=$_POST['email'];



if( !empty($phno) || !empty($code) || !empty($vendor) || !empty($gst) || !empty($mode)  || !empty($branch) || !empty($address)|| !empty($name) || !empty($email))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM vendor WHERE code='$code'";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../vendor.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO vendor (pid,code,branch,vendor,gst,mode,phno,address,name,email) VALUES('0','SKY4-$code','$branch','$vendor','$gst','$mode','$phno','$address','$name','$email')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{
	
echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../vendor.php'</script>";

 
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
