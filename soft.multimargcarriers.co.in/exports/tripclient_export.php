<?php
include('../config.php');

// CSV headers
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=client_trip_report.csv');

$output = fopen('php://output', 'w');

// Column headings
fputcsv($output, [
    'Trip No', 'Date', 'Vehicle Type', 'Vehicle No',
    'Vendor', 'Origin', 'Destination',
    'Client', 'Description', 'Box',
    'Chargeable Weight', 'Total Amount'
]);

// Get filters from URL
$fr = isset($_GET['from']) ? mysqli_real_escape_string($con, $_GET['from']) : '';
$to = isset($_GET['to']) ? mysqli_real_escape_string($con, $_GET['to']) : '';
$client = isset($_GET['client']) ? mysqli_real_escape_string($con, $_GET['client']) : '';

// Build query
if (!empty($fr) && !empty($to) && !empty($client)) {

    $sql = "
    SELECT 
        t.trip,
        t.date,
        t.vtype,
        t.vno,
        t.vendor,
        t.origin,
        t.destination,
        m.client,

        GROUP_CONCAT(
            CONCAT(m.lr, ' - ', m.consignor, ' to ', m.consignee)
            ORDER BY m.lr SEPARATOR '\n'
        ) AS description,

        SUM(IFNULL(m.box,0)) AS total_box,
        SUM(IFNULL(m.weight,0)) AS total_weight,
        SUM(IFNULL(m.amount,0)) AS total_amount

    FROM tripsheet t
    JOIN material_details m ON t.trip = m.trip

    WHERE t.date BETWEEN '$fr' AND '$to'
    AND m.client = '$client'

    GROUP BY t.trip, m.client
    ORDER BY t.trip DESC
    ";

} else {

    // Default export (no filter)
    $sql = "
    SELECT 
        t.trip,
        t.date,
        t.vtype,
        t.vno,
        t.vendor,
        t.origin,
        t.destination,
        m.client,

        GROUP_CONCAT(
            CONCAT(m.lr, ' - ', m.consignor, ' to ', m.consignee)
            ORDER BY m.lr SEPARATOR '\n'
        ) AS description,

        SUM(IFNULL(m.box,0)) AS total_box,
        SUM(IFNULL(m.weight,0)) AS total_weight,
        SUM(IFNULL(m.amount,0)) AS total_amount

    FROM tripsheet t
    LEFT JOIN material_details m ON t.trip = m.trip

    GROUP BY t.trip, m.client
    ORDER BY t.trip DESC
    ";
}

// Execute query
$result = mysqli_query($con, $sql) or die(mysqli_error($con));

// Output data
while ($row = mysqli_fetch_assoc($result)) {

    fputcsv($output, [
        $row['trip'],
        date("d-m-Y", strtotime($row['date'])),
        strtoupper($row['vtype']),
        strtoupper($row['vno']),
        strtoupper($row['vendor']),
        strtoupper($row['origin']),
        strtoupper($row['destination']),
        $row['client'],
        $row['description'],
        $row['total_box'],
        $row['total_weight'],
        $row['total_amount']
    ]);
}

fclose($output);
exit;
?>