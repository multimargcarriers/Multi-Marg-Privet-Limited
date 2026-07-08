<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$city=$_POST['city'];
$short=$_POST['short'];




if( !empty($city) || !empty($short))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM city WHERE city='$city'";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../city.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO city (pid,city,code) VALUES('0','$city','$short')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{
	
echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../city.php'</script>";

 
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
