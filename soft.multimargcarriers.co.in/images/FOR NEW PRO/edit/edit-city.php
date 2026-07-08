
<?php  
include ('../config.php');
if($_SERVER['REQUEST_METHOD']=="POST"){
$city=$_POST['city'];
$code=$_POST['code'];


if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$sql="UPDATE city SET city='$city',code='$code' WHERE city='$city'";
if ($con->query($sql) == TRUE) {
  echo "<script type='text/javascript'>alert('DATA UPDATED SUCCESFULLY');window.location= '../city.php'</script>";
} else {
  echo "Error updating record: " . $con->error;
}

}
}





?>
