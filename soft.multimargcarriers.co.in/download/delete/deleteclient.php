<?php  
include ('../config.php');
$v=$_GET['vat'];
echo $v;
$query = "DELETE FROM client WHERE pid = '$v';";
$result = mysqli_query($con, $query);
if ($result) {
    mysqli_close($con);
  	echo "<script>window.location= '../client.php'</script>";
    exit();
} else {
    echo "Error deleting record";
}
?>