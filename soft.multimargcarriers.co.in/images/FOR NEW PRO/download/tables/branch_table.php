<div class="container-fluid">
<div class="table-responsive">
                                    <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>Branch Code</th>
                                                <th>Branch Name</th>
                                                <th>Contact Person</th>
                                                <th>Address</th>
                                                <th>Phone Number</th>
                                                <th>Email</th>
                                                <th>Edit</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                            <?php

  
$retval = mysqli_query( $con, "SELECT * FROM branch order by pid asc" ) or die(mysqli_error($con));

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;
while($row=mysqli_fetch_array($retval)) {
   
                                             echo "<tr><td>".$row['code']."</td> <td>".$row['branch']."</td><td>".$row['name']."</td><td>".$row['address']."</td><td>".$row['phno']."</td><td>".$row['email']."</td>" ;  
                                               
                                                
                                                
                                                
                                                $pid=$row['pid'];

                                                echo '<td> <a href="edit-branch.php?code='.$pid.'"><button type="button" class="btn btn-info btn-circle-lg"><i
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
        window.location.href ='delete/deletebranch.php?vat='+a;
    }
}
</script> 