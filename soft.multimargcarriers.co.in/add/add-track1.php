<?php
include('../config.php');


if ($_SERVER['REQUEST_METHOD'] == "POST") {
    // Get AWB number from the form
    $party = $_POST['awb_no'];
    $gst = $_POST['status'];
    $address = $_POST['remarks'];
    $state = $_POST['date'];
    $loc=$_POST['location'];

    // Sanitize input (to prevent SQL injection)
    $party = mysqli_real_escape_string($con, $party);

    if (!empty($party)) {
        // Direct SQL query to check if status exists in the database
        $query = "SELECT * FROM track WHERE awb = '$party' ORDER BY pid DESC LIMIT 1";
        $result1 = mysqli_query($con, $query);

        // Check if the status is found
        if ($result1 && mysqli_num_rows($result1) > 0) {
            $row1 = mysqli_fetch_assoc($result1);
            $status = $row1['status'];
            
            // Check if the status is 'DELIVERED'
            if (strtolower($status) == 'delivered') {
                echo "<script type='text/javascript'>
                        if (confirm('The package with AWB number $party has already been delivered. Do you still want to save the data?')) {
                            window.location = 'save_data.php?awb=$party&status=$gst&remarks=$address&date=$state'; // URL to process saving the data
                        } else {
                            window.location = '../track.php'; // Go back to the tracking page if the user cancels
                        }
                      </script>";
            } else {
                // If the status is not delivered, proceed with saving the data
                $insert_query = "INSERT INTO track (pid, awb, remarks, status, date,location) VALUES (0, '$party', '$address', '$gst', '$state', '$loc')";
                $insert_result = mysqli_query($con, $insert_query);

                if ($insert_result) {
                    echo "<script type='text/javascript'>alert('Data saved successfully.'); window.location = '../track.php';</script>";
                } else {
                    echo "<script type='text/javascript'>alert('Failed to save data.'); window.location = '../track.php';</script>";
                }
            }
        } else {
            echo "<script type='text/javascript'>alert('No record found for AWB number $party.'); window.location = '../track.php';</script>";
        }
    } else {
        echo "<script type='text/javascript'>alert('Please enter a valid AWB number.'); window.location = '../track.php';</script>";
    }
}
?>
