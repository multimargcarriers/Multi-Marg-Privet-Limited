<div class="container-fluid">
<div class="table-responsive">
<div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <a href="exports/tripsheet_export.php"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="TRIP MANIFEST" />  </a>                               
                                    </div>
                                </div>
                                     <table id="invoice_table" class="table table-striped table-bordered display nowrap" style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>Trip No</th>
                                                <th>Date</th>
                                                <th>Vehicle Type</th>
                                                <th>Vehicle No</th>
                                                <th>Driver Name</th>
                                                <th>Vendor</th>
                                                <th>Origin</th>
                                                <th>Destination</th>
                                                <th>Material Details</th>
                                                <th>Total Amount</th>
                                                <th>Print</th>
                                                <th>Edit</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php 
$limit = 10;
$page = isset($_GET['page']) && $_GET['page'] > 0 ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

/* MAIN DATA QUERY */
$sql = "
SELECT 
    t.pid, 
    t.trip, 
    t.date, 
    t.vtype, 
    t.vno,
    t.origin, 
    t.destination, 
    t.driver,
t.vendor,
    GROUP_CONCAT(CONCAT(ld.lr, '-', UPPER(ld.client)) SEPARATOR '<br>') AS lr,
   
    SUM(ld.amount) AS amount

FROM tripsheet t
LEFT JOIN material_details ld ON ld.trip = t.trip
GROUP BY t.trip
ORDER BY t.trip DESC
LIMIT $limit OFFSET $offset
";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));
?>
<tbody>
<?php while ($row = mysqli_fetch_assoc($result)) {  ?>
<tr>
    <td><?= $row['trip'] ?></td>
    <td><?= date("d-m-Y", strtotime($row['date'])) ?></td>
    <td><?= $row['vtype'] ?></td>
    <td><?= $row['vno'] ?></td>
     <td><?= $row['driver'] ?></td>
     <td><?= $row['vendor'] ?></td>
    <td><?= strtoupper($row['origin']) ?></td>
    <td><?= strtoupper($row['destination']) ?></td>
   

    <td><?= $row['lr']?: '-' ?></td>
    <td><?= $row['amount'] ?: '-' ?></td>

   


    <!-- PRINT -->
    <td>
        <a href="tripmanifest.php?code=<?= $row['pid'] ?>" class="btn btn-info btn-circle-lg">
            <i class="fa fa-print"></i>
        </a>
    </td>

    <!-- POD -->
    

    <!-- EDIT -->
    <td>
        <a href="edit-tripsheet.php?code=<?= $row['pid'] ?>" class="btn btn-info btn-circle-lg">
            <i class="ti-eye"></i>
        </a>
    </td>

    <!-- DELETE -->
    <td>
        <button onclick="myConfirm(<?= $row['pid'] ?>)" class="btn btn-danger btn-circle-lg">
            <i class="ti-trash"></i>
        </button>
    </td>
</tr>
<?php } ?>


                                            
                                            </tbody>
    
                                    </table>
                                                                       <?php
$countResult = mysqli_query($con, "SELECT COUNT(*) AS total FROM `tripsheet`");
$countRow = mysqli_fetch_assoc($countResult);

$totalRecords = (int)$countRow['total'];
$totalPages   = ceil($totalRecords / $limit);
?>

<?php if ($totalPages > 1) { ?>
<div class="text-center mt-3">

    <!-- PREV -->
    <?php if ($page > 1) { ?>
        <a href="?page=<?= $page - 1 ?>" class="btn btn-secondary btn-sm">
            Prev
        </a>
    <?php } else { ?>
        <span class="btn btn-secondary btn-sm disabled">Prev</span>
    <?php } ?>

    <!-- CURRENT PAGE -->
    <span class="btn btn-primary btn-sm">
        Page <?= $page ?>
    </span>

    <!-- NEXT -->
    <?php if ($page < $totalPages) { ?>
        <a href="?page=<?= $page + 1 ?>" class="btn btn-secondary btn-sm">
            Next
        </a>
    <?php } else { ?>
        <span class="btn btn-secondary btn-sm disabled">Next</span>
    <?php } ?>

</div>
<?php } ?>
                        </div>
                        </div>
                       

                        <script>
function myConfirm(a){    
    var result = confirm("Are you really want to delete this item?");
    if(result){
        window.location.href ='delete/deletetripsheet.php?vat='+a;
    }
}
</script> 
