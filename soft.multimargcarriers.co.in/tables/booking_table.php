<div class="container-fluid">
<div class="table-responsive">
<div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <a href="exports/book_export.php"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="MIS REPORT" />  </a>                               
                                    </div>
                                </div>
                                <div class="row mb-3">

    <!-- SEARCH -->
    <div class="col-sm-5">
        <form method="GET" class="form-inline">

            <!-- Preserve other filters -->
            <input type="hidden" name="month"
                   value="<?= isset($_GET['month']) ? $_GET['month'] : '' ?>">

            <input type="hidden" name="limit"
                   value="<?= isset($_GET['limit']) ? $_GET['limit'] : 10 ?>">

            <div class="input-group">

                <input type="text"
                       name="search"
                       class="form-control"
                       placeholder="Search anything..."
                       value="<?= isset($_GET['search']) ? htmlspecialchars($_GET['search']) : '' ?>">

                <div class="input-group-append">
                    <button class="btn btn-primary" type="submit">
                        <i class="fa fa-search"></i> Search
                    </button>
                </div>

            </div>
        </form>
    </div>


    <!-- MONTH FILTER -->
    <div class="col-sm-3">

        <form method="GET">

            <!-- Preserve other filters -->
            <input type="hidden" name="search"
                   value="<?= isset($_GET['search']) ? htmlspecialchars($_GET['search']) : '' ?>">

            <input type="hidden" name="limit"
                   value="<?= isset($_GET['limit']) ? $_GET['limit'] : 10 ?>">

            <select name="month"
                    class="form-control"
                    onchange="this.form.submit()">

                <option value="">Current Month</option>

                <?php for($m=1;$m<=12;$m++){ ?>

                <option value="<?= $m ?>"
                <?= (isset($_GET['month']) && $_GET['month']==$m) ? 'selected' : '' ?>>

                    <?= date('F',mktime(0,0,0,$m,1)) ?>

                </option>

                <?php } ?>

            </select>

        </form>

    </div>


    <!-- RECORDS PER PAGE -->
    <div class="col-sm-2">

        <form method="GET">

            <!-- Preserve other filters -->
            <input type="hidden" name="search"
                   value="<?= isset($_GET['search']) ? htmlspecialchars($_GET['search']) : '' ?>">

            <input type="hidden" name="month"
                   value="<?= isset($_GET['month']) ? $_GET['month'] : '' ?>">

            <select name="limit"
                    class="form-control"
                    onchange="this.form.submit()">

                <?php
                $selectedLimit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

                foreach([10,25,50,100,250,500] as $l){
                ?>

                <option value="<?= $l ?>"
                    <?= $selectedLimit==$l ? 'selected' : '' ?>>

                    <?= $l ?> Records

                </option>

                <?php } ?>

            </select>

        </form>

    </div>

</div>
                                     <table id="invoice_table" class="table table-striped table-bordered display nowrap" style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>Awb No</th>
                                                <th>Date</th>
                                                <th>Consignor</th>
                                                <th>Consignee</th>
                                                <th>Origin</th>
                                                <th>Destination</th>
                                                <th>Mode</th>
                                                <th>Invoice</th>
                                                <th>Invoice Date</th>
                                                <th>Part Number</th>
                                                <th>Box</th>
                                                <th>Quantity</th>
                                                <th>Chargeable Weight</th>
                                                <th>Status</th>
                                                <th>Print</th>
                                                <th>View Pod</th>
                                                <th>Box Image</th>
                                                <th>Edit</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
$allowedLimits = [10,25,50,100,250,500];
if(!in_array($limit,$allowedLimits)){ $limit = 10; }

$search = isset($_GET['search']) ? mysqli_real_escape_string($con, $_GET['search']) : '';
$searchSql = "";
$monthSql = "";
if(isset($_GET['month']) && $_GET['month']!=''){ $month=(int)$_GET['month']; $monthSql=" AND MONTH(t.date)='$month' AND YEAR(t.date)=YEAR(CURDATE())"; } else { $monthSql=" AND MONTH(t.date)=MONTH(CURDATE()) AND YEAR(t.date)=YEAR(CURDATE())"; }

if($search != ""){
    $searchSql = " AND (
        t.awb LIKE '%$search%' OR
        t.consignor LIKE '%$search%' OR
        t.consignee LIKE '%$search%' OR
        t.origin LIKE '%$search%' OR
        t.destination LIKE '%$search%' OR
        ld.invoice LIKE '%$search%'
    )";
}
/* MAIN DATA QUERY */
$sql = "
SELECT 
    t.pid, t.awb, t.date, t.consignor, t.consignee,
    t.origin, t.destination, t.mode,
    t.box, t.charge_wt, t.type_of_delivery,
    tr.status,
    GROUP_CONCAT(ld.invoice SEPARATOR '<br>') AS invoices,
    GROUP_CONCAT(DATE_FORMAT(ld.invdate,'%d-%m-%Y') SEPARATOR '<br>') AS inv_dates,
    GROUP_CONCAT(UPPER(ld.part) SEPARATOR '<br>') AS parts,
    GROUP_CONCAT(ld.quantity SEPARATOR '<br>') AS quantities
FROM `trip` t
LEFT JOIN lr_details ld ON ld.awb = t.awb
LEFT JOIN track tr
    ON tr.pid = (
        SELECT tr2.pid
        FROM track tr2
        WHERE tr2.awb = t.awb
        ORDER BY tr2.pid DESC
        LIMIT 1
    )
    WHERE 1 $searchSql $monthSql
GROUP BY t.awb
ORDER BY t.awb DESC
LIMIT $limit
";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));
?>
<tbody>
<?php while ($row = mysqli_fetch_assoc($result)) { ?>
<tr>
    <td><?= $row['awb'] ?></td>
    <td><?= date("d-m-Y", strtotime($row['date'])) ?></td>
    <td><?= $row['consignor'] ?></td>
    <td><?= $row['consignee'] ?></td>
    <td><?= strtoupper($row['origin']) ?></td>
    <td><?= strtoupper($row['destination']) ?></td>
    <td><?= strtoupper($row['mode']) ?></td>

    <td><?= $row['invoices'] ?: '-' ?></td>
    <td><?= $row['inv_dates'] ?: '-' ?></td>
    <td><?= $row['parts'] ?: '-' ?></td>

    <td><?= $row['box'] ?></td>
    <td><?= $row['quantities'] ?: '-' ?></td>
    <td><?= $row['charge_wt'] ?></td>

    <td><?= $row['status'] ?></td>

    <!-- PRINT -->
    <td>
        <a href="lr.php?code=<?= $row['pid'] ?>" class="btn btn-info btn-circle-lg">
            <i class="fa fa-print"></i>
        </a>
    </td>

    <!-- POD -->
   <td>
        <?php
        $podQ = mysqli_query($con, "SELECT pod_name FROM pod WHERE awb='{$row['awb']}' LIMIT 1");
        if ($pod = mysqli_fetch_assoc($podQ)) {
            $file = "upload-pod/".$pod['pod_name'];
            if (file_exists($file)) {
        ?>
            <form method="post" action="view_image.php" target="_blank">
                <input type="hidden" name="filename" value="<?= htmlspecialchars($pod['pod_name']) ?>">
                <button class="btn btn-info btn-circle-lg"><i class="ti-eye"></i></button>
            </form>
        <?php } else { echo "NO POD"; } }
        else { echo "NO POD"; }
        ?>
    </td>
<td>
<?php
$podQ = mysqli_query($con, "SELECT box FROM box WHERE awb='{$row['awb']}' LIMIT 1");

$fileName = "";

if ($pod = mysqli_fetch_assoc($podQ)) {
    if (!empty($pod['box'])) {
        $fileName = trim($pod['box']);
    }
}

// ✅ IF IMAGE EXISTS IN DB → SHOW EYE
if (!empty($fileName)) {
?>
    <a href="upload-box/<?= urlencode($fileName) ?>" target="_blank">
        <button type="button" class="btn btn-info btn-circle-lg">
            <i class="ti-eye"></i>
        </button>
    </a>

<?php
} else {
    // ❌ NO IMAGE → CAMERA BUTTON
?>
    <form method="post" action="upload_box.php" enctype="multipart/form-data">
        
        <input type="hidden" name="awb" value="<?= $row['awb'] ?>">

        <input 
            type="file" 
            name="box_file" 
            id="file_<?= $row['awb'] ?>" 
            accept="image/*" 
            capture="environment"
            style="display:none;"
            onchange="this.form.submit()"
        >

        <button 
            type="button" 
            class="btn btn-success btn-circle-lg"
            onclick="document.getElementById('file_<?= $row['awb'] ?>').click();"
        >
            <i class="ti-camera"></i>
        </button>

    </form>
<?php
}
?>
</td>
    <!-- EDIT -->
    <td>
        <a href="edit-book.php?code=<?= $row['pid'] ?>" class="btn btn-info btn-circle-lg">
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
                                                                     </div>
                        </div>
                      
                        <script>
function myConfirm(a){    
    var result = confirm("Are you really want to delete this item?");
    if(result){
        window.location.href ='delete/deletebook.php?vat='+a;
    }
}
</script> 
