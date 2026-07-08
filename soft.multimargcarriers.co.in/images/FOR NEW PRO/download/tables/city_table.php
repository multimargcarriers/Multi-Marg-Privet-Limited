<div class="container-fluid">
<div class="table-responsive">
                                    <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>City</th>
                                                <th>Abbreviation</th>
                                                <th>Edit</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                            <?php

  
$retval = mysqli_query( $con, "SELECT * FROM city order by pid asc" ) or die(mysqli_error($con));

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row=mysqli_fetch_array($retval)) {
   
                                             echo "<tr><td>".$row['city']."</td> <td>".$row['code']."</td>" ;  
                                               
                                                
                                                
                                                
                                                $pid=$row['pid'];

                                                echo '<td> <a href="edit-city.php?code='.$pid.'"><button type="button" class="btn btn-info btn-circle-lg"><i
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
        window.location.href ='delete/deletecity.php?vat='+a;
    }
}
</script> 