
<?php  
include ('../config.php');
if($_SERVER['REQUEST_METHOD']=="POST"){
$branch=$_POST['branch'];
$phno=$_POST['phno'];
$address=$_POST['address'];
$name=$_POST['name'];
$email=$_POST['email'];


if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$sql="UPDATE branch SET phno='$phno',address='$address',name='$name',email='$email' WHERE branch='$branch'";
if ($con->query($sql) == TRUE) {
  echo "<script type='text/javascript'>alert('DATA UPDATED SUCCESFULLY');window.location= '../branch.php'</script>";
} else {
  echo "Error updating record: " . $con->error;
}

}
}





?>
