<?php  
include ('../config.php');
$v=$_GET['vat'];
$query2="select * from trip where pid=$v";
  $result2=mysqli_query($con,$query2);
                            $row2=mysqli_fetch_array($result2);
                            $consignment=$row2['awb'];
  $query1 = "DELETE FROM lr_details WHERE awb='$consignment'";

  $result1 = mysqli_query($con, $query1);
  if ($result1) {

$query = "DELETE FROM trip WHERE pid = '$v';";
$result = mysqli_query($con, $query);
if ($result) {
  
    mysqli_close($con);
  	echo "<script>window.location= '../book.php'</script>";
    exit();
  }
  else {
    echo "Error deleting record";
}
} else {
    echo "Error deleting record";
}
?>