
<?php  
include ('../config.php');
if($_SERVER['REQUEST_METHOD']=="POST"){
$branch=$_POST['branch'];
$phno=$_POST['phno'];
$address=$_POST['address'];
$name=$_POST['name'];
$email=$_POST['email'];
$vendor=$_POST['vendor'];
$mode=$_POST['mode'];
$gst=$_POST['gst'];

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$sql="UPDATE vendor SET phno='$phno',address='$address',name='$name',email='$email',vendor='$vendor',mode='$mode',gst='$gst',branch='$branch' WHERE vendor='$vendor'";
if ($con->query($sql) == TRUE) {
  echo "<script type='text/javascript'>alert('DATA UPDATED SUCCESFULLY');window.location= '../vendor.php'</script>";
} else {
  echo "Error updating record: " . $con->error;
}

}
}





?>
