
<?php  
include ('../config.php');
if($_SERVER['REQUEST_METHOD']=="POST"){
$code=$_POST['code'];
$awb=$_POST['awb'];
$ar=$_POST['ar'];
$ap=$_POST['ap'];
$ad=$_POST['ad'];
$tr=$_POST['tr'];
$tp=$_POST['tp'];
$td=$_POST['td'];
$rr=$_POST['rr'];
$rp=$_POST['rp'];
$rd=$_POST['rd'];
$re=$_POST['re'];
$rep=$_POST['rep'];
$red=$_POST['red'];
if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}
else
{
$sql="UPDATE rates SET awb='$awb',air_rate='$ar',air_pickup='$ap',air_delivery='$ad',train_rate='$tr',train_pickup='$tp',train_delivery='$td',road_rate='$rr',road_pickup='$rp',road_delivery='$rd',roadexpress_rate='$re',roadexpress_pickup='$rep',roadexpress_delivery='$red' WHERE code='$code'";
if ($con->query($sql) == TRUE) {
  echo "<script type='text/javascript'>alert('DATA UPDATED SUCCESFULLY');window.location= '../rate.php'</script>";
} else {
  echo "Error updating record: " . $con->error;
}

}
}





?>
