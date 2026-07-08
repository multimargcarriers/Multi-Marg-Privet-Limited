<?php  
include ('../config.php')?>




<?php
if($_SERVER['REQUEST_METHOD']=="POST"){

$date=$_POST['date'];
$amount=$_POST['amount'];
$particulars=$_POST['particulars'];
$client=$_POST['client'];



if( !empty($date) || !empty($amount) || !empty($amount) || !empty($particulars))
{

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$execute="SELECT * FROM vendor_outstanding WHERE pid='0'";
$x=mysqli_query($con,$execute);
if(mysqli_num_rows($x)>0)
{
	echo "<script type='text/javascript'>alert('Details Already Registered');window.location= '../vendor_outstanding_ledger.php?vendor=".$client."'</script>";
	 
	
}
else
{
$sql="INSERT INTO vendor_outstanding (pid,date,amount,vendor,remarks) VALUES('0','$date','$amount','$client','$particulars')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{
	
echo "<script type='text/javascript'>alert('DATA SAVED SUCCESFULLY');window.location= '../vendor_outstanding_ledger.php?vendor=".$client."'</script>";

 
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
