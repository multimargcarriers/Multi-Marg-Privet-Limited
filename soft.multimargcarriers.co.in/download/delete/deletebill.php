<?php  
include ('../config.php');
$v=$_GET['vat'];
$query2="select * from bills where pid=$v";
  $result2=mysqli_query($con,$query2);
                            $row2=mysqli_fetch_array($result2);
                            $invoice=$row2['invoice'];
  $query1 = mysqli_query( $con, "SELECT * FROM bills where invoice='$invoice'" ) or die(mysqli_error($con));

 if(! $query1 ) {
   die('Could not get data: ' . mysql_error());
}
$f=0;
 while($row1=mysqli_fetch_array($query1)) {
  $lr = $row1['awb'];
 
$sql="UPDATE trip SET status=0 where awb='$lr'";

if ($con->query($sql) === TRUE) {
$query = "DELETE FROM bills WHERE invoice = '$invoice';";
$result = mysqli_query($con, $query);
if ($result) {
    
  	$f=1;
} else {
    echo "Error deleting record";
}
}
}
if($f==1)
{
    echo "<script>window.location= '../all_bills.php'</script>";
    mysqli_close($con);
}
?>