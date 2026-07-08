<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$code=$_POST['code'];
$client=$_POST['client'];
$gst=$_POST['gst'];
$address=$_POST['address'];
$name=$_POST['name'];
$email=$_POST['email'];



if( !empty($gst) || !empty($code)  || !empty($client) || !empty($address)|| !empty($name) || !empty($email))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM client WHERE client='$client'";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../client.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO client (pid,code,client,gst,address,name,email) VALUES('0','SKY4-$code','$client','$gst','$address','$name','$email')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{
	
echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../client.php'</script>";

 
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
