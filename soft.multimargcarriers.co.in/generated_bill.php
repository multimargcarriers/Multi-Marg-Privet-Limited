<?php
session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}
  
include ('config.php');
	if ($_SERVER['REQUEST_METHOD'] === 'POST') { 
		// Form submitted 
		$party=$_POST['client1'];
        $inv=$_POST['invoice'];
        $ind=$_POST['date'];
        $mode=$_POST['mode1'];
        $gstin=$_POST['gstin'];
        $lr=$_POST['lr'];
       $c=count($lr);

       $_SESSION["inv"] ="$inv";
     
     $selected = isset($_POST['select_row']) ? $_POST['select_row'] : [];

       foreach ($selected as $i)
	{
        $lr=$_POST['lr'][$i];
        $dt=$_POST['dt'][$i];
        $origin=$_POST['origin'][$i];
        $destination=$_POST['destination'][$i];
        $pk=$_POST['box'][$i];
        $ch=$_POST['weight'][$i];
        $arate=$_POST['arate'][$i];
        $frieght=$_POST['frieght'][$i];
        $lrc=$_POST['lrc'][$i];
        $ap=$_POST['ap'][$i];
        $dp=$_POST['dp'][$i];
        $sp=$_POST['sp'][$i];
        $ot=$_POST['ot'][$i];
       $s=$frieght+$lrc+$ap+$dp+$sp+$ot;
if($mode=='AIR')
{
    $g=$s*0.18;
}
else
{
    $g=$s*0.12;
}
$tt=$s+$g;

if(mysqli_connect_error())
{
die("connection failed:".mysqli_connect_error());
}

else
{
$execute="SELECT * FROM bills WHERE invoice='$inv'";
$x=mysqli_query($con,$execute);
$am=0;
$sql="INSERT INTO bills (pid,client,invoice,invoice_date,mode,awb,awb_date,box,origin,destination,weight,rate,frieght,awb_charge,pickup,delivery,special_delivery,other_charge,gst) VALUES('0','$party','$inv' ,'$ind','$mode','$lr','$dt','$pk','$origin','$destination','$ch','$arate','$frieght','$lrc','$ap','$dp','$sp','$ot','$gstin')";
#execute above sql
$exec=mysqli_query($con,$sql) or die(mysqli_error($con));
if($exec==1)
{   $am=0;
   
	$sql="UPDATE trip SET status='1' WHERE awb=$lr";
	    if ($con->query($sql) === TRUE ) {
	$am=1;
    }
 else{
    $am=0;
 }


}
}
    }
if($am==1){
echo "<script type='text/javascript'>alert('$inv BILL GENERATED SUCCESFULLY');window.location= 'generate-bill.php'</script>";
}
   else
   {
   echo "<script type='text/javascript'>alert('HAVEN'T SELETED ANY AWB!!!! KINDLY SELECT');window.location= 'generate-bill.php'</script>";
}
    
    }
else
{ 
echo "All fields are required.";
die();
}
?>