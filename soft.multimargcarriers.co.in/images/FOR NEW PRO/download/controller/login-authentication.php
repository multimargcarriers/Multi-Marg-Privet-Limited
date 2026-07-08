<?php
// Start the session before any output
session_start();
include(index.php);
// Check if the form is submitted
if (isset($_POST['username'])) {
    $rno = $_POST['username'];
    $dob = $_POST['password'];

    if (empty($_POST)) {
        die("All fields are required");
    }
    include('config.php');
    // Verify user
    $verify = mysqli_query($con, " SELECT * FROM login  WHERE email='$rno' AND password='$dob'") or die(mysqli_error($con));

    // Check if the user is valid
    if (mysqli_num_rows($verify) == 1) {
        // Store user data in the session
        $userData = mysqli_fetch_array($verify);
        $_SESSION['user'] = $userData;
         $_SESSION['authenticated'] = true;
        // Redirect the user to the dashboard
        echo "
<script>window.location= 'dashboard.php'</script>";
        exit;
        ob_end_clean();

    } else {
        echo "
<center>
	<script>alert('Invalid Email or Password');</script>
	<center>";
    }
}
?>



