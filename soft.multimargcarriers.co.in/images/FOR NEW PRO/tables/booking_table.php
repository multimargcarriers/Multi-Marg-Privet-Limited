<div class="container-fluid">
<div class="table-responsive">
<div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <a href="exports/book_export.php"><input type="button" class="btn btn-raised btn-primary waves-effect"  value="MIS REPORT" />  </a>                               
                                    </div>
                                </div>
                                    <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
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
                                                <th>Type of Booking</th>
                                                <th>Print</th>
                                                <th>View Pod</th>
                                                <th>Edit</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                            <?php

  
$retval = mysqli_query( $con, "SELECT * FROM trip order by awb desc" ) or die(mysqli_error($con));

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row=mysqli_fetch_array($retval)) {
   $consig=$row['awb'];
                                             echo "<tr><td>".$row['awb']."</td> <td>".date("d-m-Y", strtotime($row['date']))."</td><td>".$row['consignor']."</td><td>".$row['consignee']."</td><td>".strtoupper($row['origin'])."</td><td>".strtoupper($row['destination'])."</td><td>".strtoupper($row['mode'])."</td>" ;  
                                             $retval1 = mysqli_query( $con, "SELECT * FROM lr_details where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                echo $row1['invoice']."<br>";
                                             }
                                             echo "</td>";
                                             $retval1 = mysqli_query( $con, "SELECT * FROM lr_details where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                $date_sort=date("d-m-Y", strtotime($row1['invdate']));
                                                echo $date_sort."<br>";
                                             }
                                             echo "</td>";
                                             $retval1 = mysqli_query( $con, "SELECT * FROM lr_details where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                echo strtoupper($row1['part'])."<br>";
                                                
                                             }
                                             echo "</td>";
                                              $retval1 = mysqli_query( $con, "SELECT * FROM trip where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                echo $row1['box']."<br>";
                                                
                                             }
                                             echo "</td>"; 
                                              $retval1 = mysqli_query( $con, "SELECT * FROM lr_details where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                echo strtoupper($row1['quantity'])."<br>";
                                                
                                             }
                                             echo "</td>"; 
                                             $retval1 = mysqli_query( $con, "SELECT * FROM trip where awb='$consig'" ) or die(mysqli_error($con));

                                             if(! $retval1 ) {
                                                die('Could not get data: ' . mysql_error());
                                             }
                                             $a=1;
                                             echo "<td>";
                                             while($row1=mysqli_fetch_array($retval1)) {
                                                echo $row1['charge_wt']."<br>";
                                                
                                             }
                                             echo "</td>";

                                                echo "<td>".$row['type_of_delivery']."</td> ";
                                                $pid=$row['pid'];
 echo '<td> <a href="lr.php?code='.$pid.'"><button type="button" class="btn btn-info btn-circle-lg">  <i class="fa fa-print" aria-hidden="true"></i></button></td>';
                                                

$retval1 = mysqli_query($con, "SELECT awb FROM pod") or die(mysqli_error($con));

// Assuming $consig is defined before this block
// Example:
// $consig = 'AWB12345';

$found = false;

while ($row1 = mysqli_fetch_assoc($retval1)) {
    $ty = $row1['awb'];

    if ($ty == $consig) {
        $query123 = "SELECT * FROM pod WHERE awb = '$consig'";
        $result123 = mysqli_query($con, $query123);

        while ($row123 = mysqli_fetch_assoc($result123)) {
            $filename = $row123['pod_name'];
            // corrected key name
            $filepath = "upload-pod/" . $filename;

            if (file_exists($filepath)) {
                echo "<td>
                        <form method='post' action='view_image.php' target='_blank'>
                            <input type='hidden' name='filename' value='" . htmlspecialchars($filename) . "'>
                            <button type='submit'class='btn btn-info btn-circle-lg'><i
                                                        class='ti-eye'></i></button>
                        </form>
                      </td>";
            } else {
                echo "<td>File not found: " . htmlspecialchars($filename) . "</td>";
            }

            $found = true;
            break; // optional if only one record expected
        }
        break; // exit the outer loop too since we found the match
    }
}

if (!$found) {
    echo "<td>NO POD</td>";
}


                                            echo '<td> <a href="edit-book.php?code='.$pid.'"><button type="button" class="btn btn-info btn-circle-lg"><i
                                                        class="ti-eye"></i></button></td>
                                                <td> <button type="button" onclick="myConfirm('.$row['pid'].')" class="btn btn-danger btn-circle-lg"><i
                                                        class="ti-trash"></i></button></td></tr>';
}?>
                                            
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
