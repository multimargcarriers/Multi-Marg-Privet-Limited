<div class="container-fluid">
<div class="table-responsive">
<div class="col-sm-12">

<form method="POST" id="frm1">
    <div class="row clearfix">

        <!-- CLIENT -->
        <div class="col-sm-12">
            <div class="form-group">                                 
                <label><b>CLIENT</b></label>
                <select class="form-control" name="client" required>
                    <option value="">-- Please select the Client--</option>

                    <?php 
                    $query ="SELECT client FROM trip_client ORDER BY client ASC";
                    $result = $con->query($query);

                    while($row = $result->fetch_assoc()){
                        $opt = strtoupper($row['client']);
                        $selected = (isset($_POST['client']) && $_POST['client'] == $opt) ? "selected" : "";
                        echo "<option value='$opt' $selected>$opt</option>";
                    }
                    ?>
                </select>
            </div>
        </div>

        <!-- FROM DATE -->
        <div class="col-sm-6">
            <div class="form-group">                                    
                <label><b>FROM DATE</b></label>
                <input type="date" class="form-control" name="fr" 
                    value="<?php echo $_POST['fr'] ?? ''; ?>" required>
            </div>
        </div>

        <!-- TO DATE -->
        <div class="col-sm-6">
            <div class="form-group">                                 
                <label><b>TO DATE</b></label>
                <input type="date" class="form-control" name="to" 
                    value="<?php echo $_POST['to'] ?? ''; ?>" required>
            </div>
        </div>

    </div>

    <center>
        <div class="col-sm-6">
            <div class="form-group">                                   
                <input type="submit" class="btn btn-primary" value="SEARCH" />                                   
            </div>
        </div>
    </center>

</form>

<?php
$fr = "";
$to = "";
$client = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
    $fr = mysqli_real_escape_string($con, $_POST['fr']);
    $to = mysqli_real_escape_string($con, $_POST['to']);
    $client = mysqli_real_escape_string($con, $_POST['client']);
}
?>

<!-- EXPORT BUTTON -->
<div class="form-group">                                   
    <a href="exports/tripclient_export.php?from=<?php echo $fr;?>&to=<?php echo $to;?>&client=<?php echo $client;?>">
        <input type="button" class="btn btn-primary" value="CLIENT TRIP REPORT" />
    </a> 
    <a href="trip-bill.php?from=<?php echo $fr;?>&to=<?php echo $to;?>&client=<?php echo $client;?>" target="_blank">
    <input type="button" class="btn btn-success" value="GENERATE INVOICE" />
</a>
</div>

<!-- TABLE -->
 <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
<thead>
<tr>
    <th>Trip No</th>
    <th>Date</th>
    <th>Vehicle Type</th>
    <th>Vehicle No</th>
    <th>Vendor</th>
    <th>Origin</th>
    <th>Destination</th>
    <th>Client</th>
    <th>Description</th>
    <th>Box</th>
    <th>Chargeable Weight</th>
    <th>Amount</th>
    <th>Print</th>
</tr>
</thead>

<tbody>

<?php

if (!empty($fr) && !empty($to) && !empty($client)) {

    $query = "
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
            ORDER BY m.lr SEPARATOR '<br>'
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

    // default view
    $query = "
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
            ORDER BY m.lr SEPARATOR '<br>'
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

$result = mysqli_query($con, $query);

if (!$result) {
    die("Query Failed: " . mysqli_error($con));
}

while ($row = mysqli_fetch_assoc($result)) {

    echo "<tr>
        <td>{$row['trip']}</td>
        <td>" . date("d-m-Y", strtotime($row['date'])) . "</td>
        <td>{$row['vtype']}</td>
        <td>{$row['vno']}</td>
        <td>{$row['vendor']}</td>
        <td>" . strtoupper($row['origin']) . "</td>
        <td>" . strtoupper($row['destination']) . "</td>
        <td>{$row['client']}</td>
        <td>{$row['description']}</td>
        <td>{$row['total_box']}</td>
        <td>{$row['total_weight']} kg</td>
        <td>₹" . number_format($row['total_amount'], 2) . "</td>
         <td>
        <a href='print_lr.php?trip={$row['trip']}&client={$row['client']}' target='_blank'>
            <button class='btn btn-success btn-sm'>Print</button>
        </a>
    </td>
    </tr>";
}
?>

</tbody>
</table>

</div>
</div>
</div>