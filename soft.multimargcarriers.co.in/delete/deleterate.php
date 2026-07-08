<?php  
include ('../config.php');
$v=$_GET['vat'];

$query = "DELETE FROM rates WHERE pid = '$v';";
$result = mysqli_query($con, $query);
if ($result) {
    mysqli_close($con);
  	echo "<script>window.location= '../rate.php'</script>";
    exit();
} else {
    echo "Error deleting record";
}
?>