<div class="container-fluid">
<div class="table-responsive">
<div class="col-sm-12">
    <form class="login100-form validate-form" method="POST" id="frm1" >
        <div class="row clearfix">
            <div class="col-sm-12" data-validate = "Branch is required">
                                    <div class="form-group">                                    
                                    <label><b>CLIENT</b></label>   <select class="form-control show-tick "  name="client">
                            <option></option>
    
                            <?php 
    $query ="SELECT client FROM client ORDER BY client desc";
    $result = $con->query($query);
    if($result->num_rows> 0){
        while($optionData=$result->fetch_assoc()){
        $option =strtoupper($optionData['client']);
    ?>
    <?php
    //selected option
    if(!empty($branch) && $awb== $option){
    // selected option
    ?>
               <option value="<?php echo $option; ?>" selected><?php echo $option; ?> </option>
    <?php 
continue;
   }?>
    <option value="<?php echo $option; ?>" ><?php echo $option; ?> </option>
   <?php
    }}
    ?>
</select>                                  
                                    </div>
                                </div>
        <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                    
                                    <label><b>FROM DATE</b></label>  <input type="date" class="form-control" name="fr" />                                    
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                 
                                    <label><b>TO DATE</b></label>  <input type="date" class="form-control" name="to"  />                                    
                                    </div>
                                </div>
                                </div>
                                 <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                         <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="myfc()" value="SEARCH" />                                   
                                    </div>
                                </div></center>

                                </form>
                                 <?php
   $fr=0;$to=0;$client="";
if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
                                $fr=$_POST['fr'];
                                $to=$_POST['to'];
                             $client=$_POST['client'];
                             
}      
$fr = mysqli_real_escape_string($con, $fr);
$to = mysqli_real_escape_string($con, $to);
$client = mysqli_real_escape_string($con, $client);
   ?>
                                    <div class="form-group">                                   
                                    <a href="exports/mis_export.php?from=<?php echo $fr;?>&to=<?php echo $to;?>&client=<?php echo $client;?>"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="MIS REPORT" />  </a>                               
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
    t.awb,
    t.date,
    t.consignor,
    t.consignee,
    t.origin,
    t.destination,
    t.mode,
    t.box,
    t.charge_wt,
    t.type_of_delivery,
    tr.status,
    GROUP_CONCAT(ld.invoice ORDER BY ld.invdate SEPARATOR '<br>') AS invoices,
    GROUP_CONCAT(DATE_FORMAT(ld.invdate,'%d-%m-%Y') ORDER BY ld.invdate SEPARATOR '<br>') AS inv_dates,
    GROUP_CONCAT(UPPER(ld.part) ORDER BY ld.invdate SEPARATOR '<br>') AS parts,
    GROUP_CONCAT(ld.quantity ORDER BY ld.invdate SEPARATOR '<br>') AS quantities
FROM trip t
LEFT JOIN lr_details ld ON ld.awb = t.awb
LEFT JOIN (
    SELECT tr1.awb, tr1.status
    FROM track tr1
    INNER JOIN (
        SELECT awb, MAX(pid) AS max_pid
        FROM track
        GROUP BY awb
    ) tr2 ON tr1.awb = tr2.awb AND tr1.pid = tr2.max_pid
) tr ON tr.awb = t.awb
WHERE t.status = 0
";

// Dynamic parameters
$params = [];
$types = "";

// Add client filter if provided
if (!empty($client)) {
    $sql .= " AND t.client = ?";
    $params[] = $client;
    $types .= "s";
}

// Add date filter if both from and to are provided
if (!empty($fr) && !empty($to)) {
    $sql .= " AND t.date BETWEEN ? AND ?";
    $params[] = $fr;
    $params[] = $to;
    $types .= "ss";
}

// Group and order
$sql .= " GROUP BY t.awb ORDER BY t.awb DESC";

// Prepare statement
$stmt = $con->prepare($sql);

// Bind parameters if any
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

// Execute and get result
$stmt->execute();
$retval = $stmt->get_result();


?>
<tbody>
<?php while ($row = mysqli_fetch_assoc($retval)) { ?>
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
    

    <!-- POD -->
   

    <!-- EDIT -->
    

    <!-- DELETE -->
    
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
</script> <script>
    function myfc() {
  document.getElementById("frm1").submit();
}
    </script>