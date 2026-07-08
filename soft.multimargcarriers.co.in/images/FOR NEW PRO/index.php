<?php
// Start the session before any output
session_start();

// Check if the form is submitted
if (isset($_POST['submit'])) {
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
<p style='color:red'>
  <b> Invalid Email or Password</b>
</p>
<center>";
  }
}?>




<!doctype html>
<html lang="en">
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="https://fonts.googleapis.com/css?family=Roboto:300,400&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="fonts/icomoon/style.css">

    <link rel="stylesheet" href="css/owl.carousel.min.css">

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="css/bootstrap.min.css">
    
    <!-- Style -->
    <link rel="stylesheet" href="css/style.css">
<style>html, body {
  overflow: hidden;
}
.half {
    min-height: 100vh;
    overflow: hidden;
}

.half .bg {
    width: 90%;
    background-size: cover;
    background-position: center;
    position: relative;
}

/* Fade overlay */
.half .bg::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 100%;
    background: linear-gradient(to right, rgba(255,255,255,0), #ffffff);
}

.half .contents {
    width: 50%;
    display: flex;
    align-items: center;
    background: #ffffff;
}

/* Mobile view */
@media (max-width: 991px) {
    .half .bg,
    .half .contents {
        width: 100%;
    }

    .half .bg::after {
        display: none;
    }
}
@keyframes glow {
  0% {
    text-shadow:
      0 0 5px rgba(240, 245, 252, 0.4),
      0 0 10px rgba(197, 218, 248, 0.4);
  }
  100% {
    text-shadow:
      0 0 20px rgba(128, 143, 165, 0.9),
      0 0 40px rgba(13,110,253,1);
  }
}

.glow-text {
  color: #000103ff;
  animation: glow 1.5s ease-in-out infinite alternate;
}

</style>
    <title>MULTIMARG CARRIERS</title>
  </head>
  <body>
  

  <div class="d-lg-flex half">
    <div class="bg">
    <!-- Background Image - LEFT -->
    <script type="module" src="https://unpkg.com/@splinetool/viewer@1.12.28/build/spline-viewer.js"></script>
<spline-viewer url="https://prod.spline.design/hzN5lDbUO17nrzlR/scene.splinecode"></spline-viewer>
</div>
    <!-- Login Content - RIGHT -->
    <div class="contents">

        <div class="container">
            <div class="row align-items-center justify-content-center">
                <div class="col-md-9">
                    <h3>Login to <strong class="glow-text">MULTIMARG CARRIERS</strong></h3>

                    <form method="post">
                        <div class="form-group first">
                            <label><b>Username</b></label>
                            <input type="text" class="form-control"
                                   placeholder="your-email@gmail.com" name="username">
                        </div>

                        <div class="form-group last mb-3">
                            <label><b>Password</b></label>
                            <input type="password" class="form-control"
                                   placeholder="Your Password" name="password">
                        </div>

                        <input type="submit" value="Log In"
                               class="btn btn-block btn-primary" name="submit">
                    </form>
                </div>
            </div>
        </div>

    </div>
</div>

    
    

    <script src="js/jquery-3.3.1.min.js"></script>
    <script src="js/popper.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="js/main.js"></script>
  </body>
</html>