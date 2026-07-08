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

    $verify = mysqli_query($con,
        "SELECT * FROM login WHERE email='$rno' AND password='$dob'")
        or die(mysqli_error($con));

    if (mysqli_num_rows($verify) == 1) {

        $userData = mysqli_fetch_array($verify);

        $_SESSION['user'] = $userData;
        $_SESSION['authenticated'] = true;

        echo "<script>window.location='dashboard.php'</script>";
        exit;

    } else {
        echo "<center><p style='color:red'><b>Invalid Email or Password</b></p></center>";
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
<link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="fonts/icomoon/style.css">
<link rel="stylesheet" href="css/owl.carousel.min.css">
<link rel="stylesheet" href="css/bootstrap.min.css">
<link rel="icon" type="image/png" sizes="16x16" href="logo.jpg">
<title>MULTIMARG CARRIERS</title>
<style>
html,body{height:100%;margin:0;font-family:'Roboto',sans-serif;background:#f4f7fc;overflow:hidden;}
.half{height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;background:linear-gradient(135deg,#eef4ff 0%,#f8fbff 50%,#ffffff 100%);position:relative;overflow:hidden;}
.half::before{content:"";position:absolute;width:500px;height:500px;background:radial-gradient(circle,rgba(13,110,253,.12),transparent 70%);top:-200px;left:-150px;border-radius:50%;animation:float1 8s ease-in-out infinite alternate;}
.half::after{content:"";position:absolute;width:400px;height:400px;background:radial-gradient(circle,rgba(92,167,255,.10),transparent 70%);bottom:-150px;right:-100px;border-radius:50%;animation:float2 10s ease-in-out infinite alternate;}
.contents{width:100%;display:flex;justify-content:center;align-items:center;}
.login-card{position:relative;z-index:10;width:100%;max-width:420px;padding:45px;border-radius:30px;background:rgba(255,255,255,.65);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.4);box-shadow:0 20px 50px rgba(0,0,0,.08),0 5px 20px rgba(0,0,0,.05);}
.logo{text-align:center;margin-bottom:20px}.logo img{width:90px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,.12)}
h3{font-size:32px;font-weight:300;text-align:center;margin-bottom:35px;color:#222}
.glow-text{font-weight:700;background:linear-gradient(90deg,#0d6efd,#5ca7ff,#0d6efd);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shine 4s linear infinite}
.form-group{margin-bottom:25px}label{font-weight:600;margin-bottom:10px;color:#555}
.form-control{height:55px;border-radius:16px;border:1px solid #e8edf5;padding:0 20px;background:rgba(255,255,255,.8);transition:.3s}
.form-control:focus{border-color:#0d6efd;box-shadow:0 0 0 4px rgba(13,110,253,.1)}
.btn-primary{height:55px;border:none;border-radius:16px;background:linear-gradient(135deg,#0d6efd,#5ca7ff);font-size:17px;font-weight:600;transition:.3s}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 15px 30px rgba(13,110,253,.35)}
@keyframes shine{to{background-position:200% center}}
@keyframes float1{from{transform:translateY(0) translateX(0)}to{transform:translateY(50px) translateX(30px)}}
@keyframes float2{from{transform:translateY(0) translateX(0)}to{transform:translateY(-40px) translateX(-20px)}}
@media(max-width:991px){html,body{overflow:auto}.login-card{padding:30px}h3{font-size:26px}}
</style>
</head>
<body>
<div class="half">
<div class="contents">
<div class="login-card">
<div ><center><img src="mc.png" style="width:150px; height:auto;"></center></div>
<h3>Login to <strong class="glow-text"><br>MULTIMARG CARRIERS</strong></h3>
<form method="post">
<div class="form-group">
<label><b>Username</b></label>
<input type="text" class="form-control" placeholder="your-email@gmail.com" name="username" required>
</div>
<div class="form-group">
<label><b>Password</b></label>
<input type="password" class="form-control" placeholder="Your Password" name="password" required>
</div>
<input type="submit" value="Log In →" class="btn btn-block btn-primary" name="submit">
</form>
</div>
</div>
</div>
<script src="js/jquery-3.3.1.min.js"></script>
<script src="js/popper.min.js"></script>
<script src="js/bootstrap.min.js"></script>
<script src="js/main.js"></script>
</body>
</html>
