<?php
session_start();
include('config.php');
if (!isset($_SESSION['user'])) {
    header("Location: index.php");
    exit;
}

include('config.php');
$user_id = $_SESSION['user']['pid'];
$stmt = $con->prepare("SELECT name FROM login WHERE pid = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $t = $row['name']; // Now $t holds the user's name
} else {
    echo "User not found.";
    exit;
}

include('header/header.php');
?>

        <!-- ============================================================== -->
        <!-- End Left Sidebar - style you can find in sidebar.scss  -->
        <!-- ============================================================== -->
        <!-- ============================================================== -->
        <!-- Page wrapper  -->
        <!-- ============================================================== -->
        <div class="page-wrapper">
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
            <div class="page-breadcrumb">
                <div class="row">
                    <div class="col-7 align-self-center">
                        <h3 class="page-title text-truncate text-dark font-weight-medium mb-1"><?php
date_default_timezone_set('Asia/Kolkata');
$t1 = date("H:i");

if ($t1 >= "00:00" && $t1 <= "11:59") {
    echo " Good Morning ";
} elseif ($t1 >= "12:00" && $t1 <= "15:59") {
    echo " Good Afternoon " ;
} else {
    echo " Good Evening ";
}
echo " ".$t;
$sql = "SELECT * from client";

if ($result = mysqli_query($con, $sql)) {

    // Return the number of rows in result set
    $rowcount = mysqli_num_rows( $result );
    
    // Display result
 }
 $sql = "SELECT * from trip  WHERE MONTH(date) = MONTH(CURRENT_DATE()) 
        AND YEAR(date) = YEAR(CURRENT_DATE())";

if ($result1 = mysqli_query($con, $sql)) {

    // Return the number of rows in result set
    $rowcount1 = mysqli_num_rows( $result1 );
    
    // Display result
 }
  $sql12 = "SELECT * FROM bills WHERE MONTH(invoice_date) = MONTH(CURRENT_DATE()) AND YEAR(invoice_date) = YEAR(CURRENT_DATE()) group by invoice having count(invoice)>=1 ";

if ($result12 = mysqli_query($con, $sql12)) {

    // Return the number of rows in result set
    $rowcount12 = mysqli_num_rows( $result12 );
   
    // Display result
 }
   $retval1 = mysqli_query($con, "SELECT * FROM bills WHERE MONTH(invoice_date) = MONTH(CURRENT_DATE()) 
        AND YEAR(invoice_date) = YEAR(CURRENT_DATE())") or die(mysqli_error($con));

if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$sub_total=0;$gst=0;$total=0;
while($row1=mysqli_fetch_array($retval1)) {

                                             $frieght=$row1['frieght'];
                                             $awb_charge=$row1['awb_charge'];
                                             $pickup=$row1['pickup'];
                                             $delivery=$row1['delivery'];
                                             $special_delivery=$row1['special_delivery'];
                                             $other_charge=$row1['other_charge'];
                                             $sub_total=$sub_total+$frieght+$awb_charge+$pickup+$delivery+$special_delivery+$other_charge;

                                             
                                             
                                           }
?></h3>
                        
                        <div class="d-flex align-items-center">
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb m-0 p-0">
                                    <li class="breadcrumb-item"><a href="index.php">Dashboard</a>
                                    </li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    <div class="col-5 align-self-center">
                        <div class="customize-input float-right">
                        <div class=" custom-select-set form-control bg-white border-0 custom-shadow custom-radius">
    <b><?php
// Get the current date and time

$currentDate = date("d-M");

// Print the current date
echo "<span style='font-size:14px;'>$currentDate</span>";
?></b>
    
    </div>

                        </div>
                    </div>
                </div>
            </div>
            <!-- ============================================================== -->
            <!-- End Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
            <!-- ============================================================== -->
            <!-- Container fluid  -->
            <!-- ============================================================== -->
            <div class="container-fluid">
                <!-- *************************************************************** -->
                <!-- Start First Cards -->
                <!-- *************************************************************** -->
                <div class="card-group">
                    <div class="card border-right">
                        <div class="card-body">
                            <div class="d-flex d-lg-flex d-md-block align-items-center">
                                <div>
                                    <div class="d-inline-flex align-items-center">
                                        <h2 class="text-dark mb-1 font-weight-medium"><?php echo $rowcount;?></h2>
                                    </div>
                                    <h6 class="text-muted font-weight-normal mb-0 w-100 text-truncate">New Clients</h6>
                                </div>
                                <div class="ml-auto mt-md-3 mt-lg-0">
                                    <a href="client.php">
                                        <span class="opacity-7 text-muted"><i data-feather="user-plus"></i></span></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card border-right">
                        <div class="card-body">
                            <div class="d-flex d-lg-flex d-md-block align-items-center">
                                <div>
                                    <h2 class="text-dark mb-1 w-100 text-truncate font-weight-medium">&#8377; <?php echo $sub_total;?></h2>
                                    <h6 class="text-muted font-weight-normal mb-0 w-100 text-truncate">Earnings of Month
                                    </h6>
                                </div>
                                <div class="ml-auto mt-md-3 mt-lg-0">
                                    <span class="opacity-7 text-muted"><i data-feather="dollar-sign"></i></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card border-right">
                        <div class="card-body">
                            <div class="d-flex d-lg-flex d-md-block align-items-center">
                                <div>
                                    <div class="d-inline-flex align-items-center">
                                        <h2 class="text-dark mb-1 font-weight-medium"><?php echo $rowcount1;?></h2>
                                        
                                    </div>
                                    <h6 class="text-muted font-weight-normal mb-0 w-100 text-truncate">New Bookings of Month</h6>
                                </div>
                                <div class="ml-auto mt-md-3 mt-lg-0">
                                <a href="book.php">
                                    <span class="opacity-7 text-muted"><i data-feather="file-plus"></i></span></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex d-lg-flex d-md-block align-items-center">
                                <div>
                                    <h2 class="text-dark mb-1 font-weight-medium"><?php echo $rowcount12;?></h2>
                                    <h6 class="text-muted font-weight-normal mb-0 w-100 text-truncate">Total Invoice of Month</h6>
                                </div>
                                <div class="ml-auto mt-md-3 mt-lg-0">
                                     
                                    <span class="opacity-7 text-muted"><i data-feather="globe"></i></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- *************************************************************** -->
                <!-- End First Cards -->
                <!-- *************************************************************** -->
                <!-- *************************************************************** -->
                <!-- Start Sales Charts Section -->
                <!-- *************************************************************** -->
                
                <!-- *************************************************************** -->
                <!-- End Sales Charts Section -->
                <!-- *************************************************************** -->
                <!-- *************************************************************** -->
                <!-- Start Location and Earnings Charts Section -->
                <!-- *************************************************************** -->
                
                <!-- *************************************************************** -->
                <!-- End Location and Earnings Charts Section -->
                <!-- *************************************************************** -->
                <!-- *************************************************************** -->
                <!-- Start Top Leader Table -->
                <!-- *************************************************************** -->
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-4">
                                    <h4 class="card-title">Top Leaders</h4>
                                    <div class="ml-auto">
                                        <div class="dropdown sub-dropdown">
                                            
                                           <!-- <div class="dropdown-menu dropdown-menu-right" aria-labelledby="dd1">
                                                <a class="dropdown-item" href="#">Insert</a>
                                                <a class="dropdown-item" href="#">Update</a>
                                                <a class="dropdown-item" href="#">Delete</a>
                                            </div>-->
                                        </div>
                                    </div>
                                </div>
                                <div class="table-responsive">
                                    <table class="table no-wrap v-middle mb-0">
                                        <thead>
                                            <tr class="border-0">
                                                <th class="border-0 font-14 font-weight-medium text-muted">Employees
                                                </th>
                                                <th class="border-0 font-14 font-weight-medium text-muted px-2">Designation
                                                </th>
                                                <th class="border-0 font-14 font-weight-medium text-muted">Branch</th>
                                                <th class="border-0 font-14 font-weight-medium text-muted text-center">
                                                    Phone No
                                                </th>
                                                <th class="border-0 font-14 font-weight-medium text-muted text-center">
                                                    Joining Date
                                                </th>
                                                
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td class="border-top-0 px-2 py-4">
                                                    <div class="d-flex no-block align-items-center">
                                                        <div class="mr-3"><img
                                                                src="assets/images/users/dhruv.jpg"
                                                                alt="user" class="rounded-circle" width="45"
                                                                height="45" /></div>
                                                        <div class="">
                                                            <h5 class="text-dark mb-0 font-16 font-weight-medium">Dhruv Kumar</h5>
                                                            <span class="text-muted font-14">dhruv.kr@multimargcarriers.co.in</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="border-top-0 text-muted px-2 py-4 font-14">Marketing Head</td>
                                               <td class="border-top-0 font-weight-medium text-muted px-2 py-4">
                                                        Pantnagar
                                                        
                                                   
                                                </td>
                                                <td class="border-top-0 text-center font-weight-medium text-muted px-2 py-4">9045015097</td>
                                                <td
                                                    class="border-top-0 text-center font-weight-medium text-muted px-2 py-4">
                                                    01-04-2025
                                                </td>
                                               
                                            </tr>
                                            <tr>
                                                <td class="px-2 py-4">
                                                    <div class="d-flex no-block align-items-center">
                                                        <div class="mr-3"><img
                                                                src="assets/images/users/dharmendra.jpg"
                                                                alt="user" class="rounded-circle" width="45"
                                                                height="45" /></div>
                                                        <div class="">
                                                            <h5 class="text-dark mb-0 font-16 font-weight-medium">Dharmendra Puri</h5>
                                                            <span class="text-muted font-14">d.puri@multimargcarriers.co.in</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class=" text-muted px-2 py-4 font-14">Operations Head</td>
                                               <td class=" font-weight-medium text-muted px-2 py-4">
                                                        Delhi
                                                        
                                                   
                                                </td>
                                                <td class=" text-center font-weight-medium text-muted px-2 py-4">7503112217</td>
                                                <td
                                                    class=" text-center font-weight-medium text-muted px-2 py-4">
                                                    01-04-2025
                                                </td>
                                               
                                            </tr>
                                            
                                            <tr>
                                                <td class="px-2 py-4">
                                                    <div class="d-flex no-block align-items-center">
                                                        <div class="mr-3"><img
                                                                src="assets/images/users/a.jpg"
                                                                alt="user" class="rounded-circle" width="45"
                                                                height="45" /></div>
                                                        <div class="">
                                                            <h5 class="text-dark mb-0 font-16 font-weight-medium">Akash Debnath</h5>
                                                            <span class="text-muted font-14">info@multimargcarriers.co.in</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class=" text-muted px-2 py-4 font-14">IT & Accounts Head</td>
                                               <td class=" font-weight-medium text-muted px-2 py-4">
                                                        Jamshedpur
                                                        
                                                   
                                                </td>
                                                <td class=" text-center font-weight-medium text-muted px-2 py-4">7209877637</td>
                                                <td
                                                    class=" text-center font-weight-medium text-muted px-2 py-4">
                                                    01-05-2025
                                                </td>
                                               
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- *************************************************************** -->
                <!-- End Top Leader Table -->
                <!-- *************************************************************** -->
            </div>
            <!-- ============================================================== -->
            <!-- End Container fluid  -->
            <!-- ============================================================== -->
            <!-- ============================================================== -->
            <!-- footer -->
            <!-- ============================================================== -->
            <footer class="footer text-center text-muted">
                All Rights Reserved by Sky 4 Logistics. Designed and Developed by <a
                    href="https://amishkainfotech.co.in">aMIshka Infotech</a>.
            </footer>
            <!-- ============================================================== -->
            <!-- End footer -->
            <!-- ============================================================== -->
        </div>
        <!-- ============================================================== -->
        <!-- End Page wrapper  -->
        <!-- ============================================================== -->
    </div>
    <!-- ============================================================== -->
    <!-- End Wrapper -->
    <!-- ============================================================== -->
    <!-- End Wrapper -->
    <!-- ============================================================== -->
    <!-- All Jquery -->
    <!-- ============================================================== -->
    <?php include('header/footer.php'); ?>