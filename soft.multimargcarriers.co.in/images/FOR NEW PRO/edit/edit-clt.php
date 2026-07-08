
<?php  
include ('../config.php');
if($_SERVER['REQUEST_METHOD']=="POST"){
$client=$_POST['client'];
$gst=$_POST['gst'];
$address=$_POST['address'];
$name=$_POST['name'];
$email=$_POST['email'];


if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$sql="UPDATE client SET gst='$gst',address='$address',name='$name',email='$email' WHERE client='$client'";
if ($con->query($sql) == TRUE) {
  echo "<script type='text/javascript'>alert('DATA UPDATED SUCCESFULLY');window.location= '../client.php'</script>";
} else {
  echo "Error updating record: " . $con->error;
}

}
}





?>
