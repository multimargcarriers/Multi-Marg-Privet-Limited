<div class="container-fluid">
<div class="table-responsive">
                                    <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>Client</th>
                                                <th>Origin</th>
                                                <th>Destination</th>
                                                <th>Awb Charge</th>
                                                <th>Air-Rate</th>
                                                <th>Train-Rate</th>
                                                <th>Road-Rate</th>
                                                <th>Edit</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                            <?php

  
$retval = mysqli_query( $con, "SELECT * FROM rates order by pid asc" ) or die(mysqli_error($con));

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row=mysqli_fetch_array($retval)) {
   
                                             echo "<tr><td>".$row['client']."</td> <td>".$row['origin']."</td><td>".$row['destination']."</td><td>".$row['awb']."</td><td>".$row['air_rate']."</td><td>".$row['train_rate']."</td><td>".$row['road_rate']."</td>" ;  
                                               
                                                
                                                
                                                
                                                $pid=$row['pid'];

                                                echo '<td> <a href="edit-rate.php?code='.$pid.'"><button type="button" class="btn btn-info btn-circle-lg"><i
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
        window.location.href ='delete/deleterate.php?vat='+a;
    }
}
</script> 