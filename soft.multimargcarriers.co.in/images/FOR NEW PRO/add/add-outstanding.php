<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$date=$_POST['date'];
$amount=$_POST['amount'];
$client=$_POST['client'];



if( !empty($date) || !empty($amount) || !empty($amount))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM outstanding WHERE pid='0'";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../city.php'</script>";
	 
	
}
else
{
$sql="INSERT INTO outstanding (pid,date,amount,client) VALUES('0','$date','$amount','$client')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{
	
echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../outstanding_ledger.php?client=".$client."'</script>";

 
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
