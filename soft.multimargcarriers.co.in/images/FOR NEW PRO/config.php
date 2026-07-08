<?php
//connection code
$username ='root';
$password = '';
$host='localhost';
$dbname='new log';
#create the linker
$con=mysqli_connect($host,$username,$password,$dbname) or die(mysqli_error($con));
?>
