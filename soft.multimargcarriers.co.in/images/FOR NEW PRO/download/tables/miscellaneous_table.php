<div class="container-fluid">
<div class="table-responsive">
                                    <table id="default_order" class="table table-striped table-bordered display no-wrap"
                                        style="width:100%">
                                        <thead>
                                            <tr>
                                                <th>Invoice Number</th>
                                                <th>Invoice Date</th>
                                                <th>Sub Total</th>
                                                <th>GST</th>
                                                <th>Total</th>
                                                <th>View Bill</th>
                                                <th>Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            
                                            <?php

  
$retval = mysqli_query( $con, "SELECT * FROM miscellaneous order by pid asc" ) or die(mysqli_error($con));

if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=0;$gst=0;$tt=0;
while($row=mysqli_fetch_array($retval)) {
   $file_name=$row['file_name'];
                                             echo "<tr><td>".$row['invoice']."</td> <td>".$row['invoice_date']."</td>" ;  
                                             $inv=$row['invoice'];
                                               $retval1 = mysqli_query( $con, "SELECT * FROM bills where invoice='$inv'" ) or die(mysqli_error($con));

if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}

while($row1=mysqli_fetch_array($retval1)){
$mode=$row1['mode'];
$a=$row1['frieght']+$row1['awb_charge']+$row1['other_charge'];
}
if ($mode=="Air") 
{
    $c=($a*18/100);
    $gst=round($c,2);
}
else
{
    $gst=round(($a*12/100),2);
}
$tt=$a+$gst;
                                                 echo "<td>".$a."</td> <td>".$gst."</td><td>".$tt."</td>" ;  
                                                
                                                
                                                $pid=$row['pid'];

                                                echo '
                                                <td> <button type="button"  class="btn btn-info btn-circle-lg"><a href="viewpdf.php?filename=upload/'.$file_name.'"><i
                                                        class="ti-eye" style="color:white;"></i></a></button></td>
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
        window.location.href ='delete/deletemiscellaneous.php?vat='+a;
    }
}
</script> 