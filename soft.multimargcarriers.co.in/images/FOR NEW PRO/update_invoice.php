<?php
include('config.php');
session_start();

if (isset($_POST['saveChanges'])) {
    $lrs = $_POST['lr'];
    $boxes = $_POST['box'];
    $weights = $_POST['weight'];
    $rates = $_POST['rate'];
    $freights = $_POST['frieght'];
    $awbs = $_POST['awb_charge'];
    $pickups = $_POST['pickup'];
    $deliveries = $_POST['delivery'];
    $specials = $_POST['special_delivery'];
    $others = $_POST['other_charge'];

    for ($i = 0; $i < count($lrs); $i++) {
        $lr = mysqli_real_escape_string($con, $lrs[$i]);
        $box = mysqli_real_escape_string($con, $boxes[$i]);
        $weight = mysqli_real_escape_string($con, $weights[$i]);
        $rate = mysqli_real_escape_string($con, $rates[$i]);
        $freight = mysqli_real_escape_string($con, $freights[$i]);
        $awb_charge = mysqli_real_escape_string($con, $awbs[$i]);
        $pickup = mysqli_real_escape_string($con, $pickups[$i]);
        $delivery = mysqli_real_escape_string($con, $deliveries[$i]);
        $spcl = mysqli_real_escape_string($con, $specials[$i]);
        $other = mysqli_real_escape_string($con, $others[$i]);

        $sql = "UPDATE bills 
                SET box='$box', weight='$weight', rate='$rate', frieght='$freight',
                    awb_charge='$awb_charge', pickup='$pickup', delivery='$delivery',
                    special_delivery='$spcl', other_charge='$other'
                WHERE awb='$lr'";

        mysqli_query($con, $sql) or die("Error updating record: " . mysqli_error($con));
    }

    echo "<script>alert('Invoice data updated successfully!');window.location= 'all_bills.php';</script>";
} else {
    echo "Invalid access.";
}
?>
