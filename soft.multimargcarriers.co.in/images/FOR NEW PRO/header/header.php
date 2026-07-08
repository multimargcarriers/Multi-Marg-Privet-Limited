<!DOCTYPE html>
<html dir="ltr" lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!-- Tell the browser to be responsive to screen width -->
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <!-- Favicon icon -->
    <link rel="icon" type="image/png" sizes="16x16" href="logo.jpg">
    <title>MULTIMARG CARRIERS</title>
    <!-- Custom CSS -->
   
    <link href="assets/extra-libs/c3/c3.min.css" rel="stylesheet">
    <link href="assets/libs/chartist/dist/chartist.min.css" rel="stylesheet">
    <link href="assets/extra-libs/jvector/jquery-jvectormap-2.0.2.css" rel="stylesheet" />
    <!-- Custom CSS -->
    <link href="dist/css/style.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Karla:400,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css">
    <link href="assets/extra-libs/datatables.net-bs4/css/dataTables.bootstrap4.css" rel="stylesheet">
    <link href="assets/plugins/bootstrap-select/css/bootstrap-select.css" rel="stylesheet" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0/css/select2.min.css" rel="stylesheet" />
    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
    <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
<![endif]-->
<style>
    .navbar-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.navbar-brand a {
    display: flex;
    align-items: center;
    justify-content: center;
}
    </style>
</head>

<body>
    <!-- ============================================================== -->
    <!-- Preloader - style you can find in spinners.css -->
    <!-- ============================================================== -->
    <div class="preloader">
        <div class="lds-ripple">
            <div class="lds-pos"></div>
            <div class="lds-pos"></div>
        </div>
    </div>
    <!-- ============================================================== -->
    <!-- Main wrapper - style you can find in pages.scss -->
    <!-- ============================================================== -->
    <div id="main-wrapper" data-theme="light" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full"
        data-sidebar-position="fixed" data-header-position="fixed" data-boxed-layout="full">
        <!-- ============================================================== -->
        <!-- Topbar header - style you can find in pages.scss -->
        <!-- ============================================================== -->
        <header class="topbar" data-navbarbg="skin6">
            <nav class="navbar top-navbar navbar-expand-md">
                <div class="navbar-header" data-logobg="skin6">
                    <!-- This is for the sidebar toggle which is visible on mobile only -->
                    <a class="nav-toggler waves-effect waves-light d-block d-md-none" href="javascript:void(0)"><i
                            class="ti-menu ti-close"></i></a>
                    <!-- ============================================================== -->
                    <!-- Logo -->
                    <!-- ============================================================== -->
                  
                        <!-- Logo icon -->
                       <a href="#" style="display:flex; justify-content:center; align-items:center; width:100%;">
    <img 
        src="logo.jpg" 
        alt="homepage"
        style="
            height:90px;      /* resize here */
            width:auto;
            max-width:160px;
        "
    />
</a>
                   
                    <!-- ============================================================== -->
                    <!-- End Logo -->
                    <!-- ============================================================== -->
                    <!-- ============================================================== -->
                    <!-- Toggle which is visible on mobile only -->
                    <!-- ============================================================== -->
                    <a class="topbartoggler d-block d-md-none waves-effect waves-light" href="javascript:void(0)"
                        data-toggle="collapse" data-target="#navbarSupportedContent"
                        aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation"><i
                            class="ti-more"></i></a>
                </div>
                <!-- ============================================================== -->
                <!-- End Logo -->
                <!-- ============================================================== -->
                <div class="navbar-collapse collapse" id="navbarSupportedContent">
                    <!-- ============================================================== -->
                    <!-- toggle and nav items -->
                    <!-- ============================================================== -->
                    <ul class="navbar-nav float-left mr-auto ml-5 pl-1">
                        <!-- Notification -->
                     
                        <!-- End Notification -->
                        <!-- ============================================================== -->
                        <!-- create new -->
                        <!-- ============================================================== -->
                     
                    </ul>  
                    <!-- ============================================================== -->
                    <!-- Right side toggle and nav items -->
                    <!-- ============================================================== -->
                    <ul class="navbar-nav float-right">
                        <!-- ============================================================== -->
                        <!-- Search -->
                        <!-- ============================================================== -->
                        
                        <!-- ============================================================== -->
                        <!-- User profile and search -->
                        <!-- ============================================================== -->
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle" href="javascript:void(0)" data-toggle="dropdown"
                                aria-haspopup="true" aria-expanded="false">
                                <img src="assets/images/users/profile-pic.jpg" alt="user" class="rounded-circle"
                                    width="40">
                                <span class="ml-2 d-none d-lg-inline-block"><span>Hello,</span> <span
                                        class="text-dark"><?php echo $t;?></span> <i data-feather="chevron-down"
                                        class="svg-icon"></i></span>
                            </a>
                            <div class="dropdown-menu dropdown-menu-right user-dd animated flipInY">
                                
                                <div class="dropdown-divider"></div>
                                <a class="dropdown-item" href="logout.php"><i data-feather="power"
                                        class="svg-icon mr-2 ml-1"></i>
                                    Logout</a>
                                
                            </div>
                        </li>
                        <!-- ============================================================== -->
                        <!-- User profile and search -->
                        <!-- ============================================================== -->
                    </ul>
                </div>
            </nav>
        </header>
        <!-- ============================================================== -->
        <!-- End Topbar header -->
        <!-- ============================================================== -->
        <!-- ============================================================== -->
        <!-- Left Sidebar - style you can find in sidebar.scss  -->
        <!-- ============================================================== -->
        <aside class="left-sidebar" data-sidebarbg="skin6">
            <!-- Sidebar scroll-->
            <div class="scroll-sidebar" data-sidebarbg="skin6">
                <!-- Sidebar navigation-->
                <nav class="sidebar-nav">
                    <ul id="sidebarnav">
                    <?php if($t=="Operation Team"){ ?>
                      <li class="sidebar-item"> <a class="sidebar-link sidebar-link" href="dashboard.php"
                                aria-expanded="false"><i data-feather="home" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Dashboard</B></span></a></li>
                     <li class="list-divider"></li>
                        <li class="nav-small-cap"><span class="hide-menu"><B style="color:black">Operations</B></span></li>
                        <li class="sidebar-item"> <a class="sidebar-link has-arrow" href="javascript:void(0)"
                                aria-expanded="false"><i data-feather="file-text" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Masters</B> </span></a>
                            <ul aria-expanded="false" class="collapse  first-level base-level-line">
                                <li class="sidebar-item"><a href="client.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Client Master</B>
                                        </span></a>
                                </li>
                                <li class="sidebar-item"><a href="branch.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Branch Master</B>
                                        </span></a>
                                </li>
                                <li class="sidebar-item"><a href="city.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> City Master</B>
                                        </span></a>
                                </li>
                                <li class="sidebar-item"><a href="vendor.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Vendor Master</B>
                                        </span></a>
                                </li>
                            </ul>
                        </li>
                        <li class="sidebar-item"> <a class="sidebar-link has-arrow" href="javascript:void(0)"
                                aria-expanded="false"><i data-feather="bar-chart" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Operations</B> </span></a>
                            <ul aria-expanded="false" class="collapse  first-level base-level-line">
                                <li class="sidebar-item"><a href="book.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Booking</B>
                                        </span></a>
                                </li>
                               <li class="sidebar-item"><a href="pod.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> POD Upload</B>
                                        </span></a>
                                </li> 
                                <li class="sidebar-item"><a href="track.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black">
                                            Tracking</B>
                                        </span></a>
                                </li>
                            </ul>
                        </li>
                            <?php }
                            else{ ?>
                        <li class="sidebar-item"> <a class="sidebar-link sidebar-link" href="dashboard.php"
                                aria-expanded="false"><i data-feather="home" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Dashboard</B></span></a></li>
                        
                        <li class="list-divider"></li>
                        <li class="nav-small-cap"><span class="hide-menu"><B style="color:black">Operations</B></span></li>
                        <li class="sidebar-item"> <a class="sidebar-link has-arrow" href="javascript:void(0)"
                                aria-expanded="false"><i data-feather="file-text" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Masters</B> </span></a>
                            <ul aria-expanded="false" class="collapse  first-level base-level-line">
                                <li class="sidebar-item"><a href="client.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Client Master</B>
                                        </span></a>
                                </li>
                                <li class="sidebar-item"><a href="branch.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Branch Master</B>
                                        </span></a>
                                </li>
                                <li class="sidebar-item"><a href="city.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> City Master</B>
                                        </span></a>
                                </li>
                                <li class="sidebar-item"><a href="vendor.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Vendor Master</B>
                                        </span></a>
                                </li>
                            </ul>
                        </li>
                        <li class="sidebar-item"> <a class="sidebar-link has-arrow" href="javascript:void(0)"
                                aria-expanded="false"><i data-feather="grid" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Rates</B> </span></a>
                            <ul aria-expanded="false" class="collapse  first-level base-level-line">
                                <li class="sidebar-item"><a href="rate.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Client Rates</B>
                                        </span></a>
                                </li>
                               
                            </ul>
                        </li>
                        <li class="sidebar-item"> <a class="sidebar-link has-arrow" href="javascript:void(0)"
                                aria-expanded="false"><i data-feather="bar-chart" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Operations</B> </span></a>
                            <ul aria-expanded="false" class="collapse  first-level base-level-line">
                                <li class="sidebar-item"><a href="book.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> Booking</B>
                                        </span></a>
                                </li>
                               <li class="sidebar-item"><a href="pod.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black"> POD Upload</B>
                                        </span></a>
                                </li> 
                                <li class="sidebar-item"><a href="track.php" class="sidebar-link"><span
                                            class="hide-menu"><B style="color:black">
                                            Tracking</B>
                                        </span></a>
                                </li>
                            </ul>
                        </li>
                        <li class="list-divider"></li>
                        <li class="nav-small-cap"><span class="hide-menu">Accounts</span></li>
                        <li class="sidebar-item"> <a href="all_bills.php" class="sidebar-link"><i data-feather="file-text" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">All Bills</B> </span></a>
                           
                        </li>
                        <li class="sidebar-item"><a href="generate-bill.php" class="sidebar-link"><i data-feather="grid" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Generate Bills </B></span></a>
                        </li>
                        <li class="sidebar-item"><a href="miscellaneous-bill.php" class="sidebar-link"><i data-feather="grid" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Miscellaneous Bills</B> </span></a>
                        </li>
                        <li class="sidebar-item"> <a href="purchase.php" class="sidebar-link"><i data-feather="bar-chart" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Purchase Bills</B> </span></a>
                        </li>
                        <li class="sidebar-item"> <a href="cashsheet.php" class="sidebar-link"><i class="fa fa-money"></i><span
                                    class="hide-menu"><B style="color:black"> Cash Sheet Entry</B> </span></a>
                        </li>
                        <li class="list-divider"></li>
                        <li class="nav-small-cap"><span class="hide-menu"><B style="color:black">Reports</B></span></li>
                        <li class="sidebar-item"> <a href="gst.php" class="sidebar-link"><i data-feather="file-text" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">GSTR Reports</B> </span></a>
                           
                        </li>
                        <li class="sidebar-item"> <a href="mis.php" class="sidebar-link"><i data-feather="grid" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">MIS Reports</B> </span></a>
                        </li>
                        <li class="sidebar-item"> <a href="unbilled.php" class="sidebar-link"><i data-feather="bar-chart" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Unbilled Reports</B> </span></a>
                        </li>
                        <li class="sidebar-item"> <a href="sales_report.php" class="sidebar-link"><i class="fa fa-credit-card"></i><span
                                    class="hide-menu"><B style="color:black">Sales Reports </B></span></a>
                        </li> 
                        <li class="sidebar-item"> <a href="purchase_report.php" class="sidebar-link"><i class="fa fa-hdd-o"></i><span
                                    class="hide-menu"><B style="color:black">Purchase Reports</B> </span></a>
                        </li>
                         <li class="sidebar-item"> <a href="cashsheet_reports.php" class="sidebar-link"><i class="fa fa-credit-card"></i><span
                                    class="hide-menu"><B style="color:black">Cashsheet Reports </B></span></a>
                        </li>
                        <?php } ?>
                        <li class="list-divider"></li>
                       
                        <li class="sidebar-item"> <a class="sidebar-link sidebar-link" href="logout.php"
                                aria-expanded="false"><i data-feather="log-out" class="feather-icon"></i><span
                                    class="hide-menu"><B style="color:black">Logout</B></span></a></li>
                    </ul>
                </nav>
                <!-- End Sidebar navigation -->
            </div>
            <!-- End Sidebar scroll-->
        </aside>