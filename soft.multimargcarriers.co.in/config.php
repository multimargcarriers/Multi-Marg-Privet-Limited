<?php
//connection code
$username ='multihyx_multimarg-carriers';
$password = 'Akash@123';
$host='localhost';
$dbname='multihyx_new_multimarg';
#create the linker
$con=mysqli_connect($host,$username,$password,$dbname) or die(mysqli_error($con));
?>
