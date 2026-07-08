<?php
// Start the session before any output
session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}

include('header/header.php');
include('config.php');
?>
<div class="page-wrapper">
		<div class="page-breadcrumb">
 <div class="body">
 <h2 class="card-inside-title">Mis Report</h2>
<?php include('tables/mis_table.php');?>
</div>
</div>
</div>
<?php
include('header/footer.php');
?>