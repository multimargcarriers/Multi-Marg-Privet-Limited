<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$code=$_POST['code'];
$branch=$_POST['branch'];
$name=$_POST['name'];
$address=$_POST['address'];
$phno=$_POST['phno'];
$email=$_POST['email'];



if( !empty($phno) || !empty($code)  || !empty($branch) || !empty($address)|| !empty($name) || !empty($email))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM branch WHERE code='$code'";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../branch.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO branch (pid,code,branch,phno,address,name,email) VALUES('0','MCPL-$code','$branch','$phno','$address','$name','$email')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{
	
echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../branch.php'</script>";

 
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
