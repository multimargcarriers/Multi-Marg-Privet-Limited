<?php  
include ('../config.php');
$v=$_GET['vat'];
$query = "DELETE FROM city WHERE pid = '$v';";
$result = mysqli_query($con, $query);
if ($result) {
    mysqli_close($con);
  	echo "<script>window.location= '../city.php'</script>";
    exit();
} else {
    echo "Error deleting record";
}
?>