const nodemailer = require("nodemailer");

// Hostinger SMTP Configuration — set these in your .env file:
// SMTP_HOST=smtp.hostinger.com
// SMTP_PORT=465
// SMTP_USER=your-email@yourdomain.com
// SMTP_PASS=your-email-password
// SMTP_FROM=your-email@yourdomain.com
const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const senderEmail = process.env.SMTP_FROM || smtpUser;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

const sendEmail = async ({ to, subject, htmlContent, attachments }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Multimarg Carriers" <${senderEmail}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      ...(attachments ? { attachments } : {})
    });
    
    console.log(`[Mail] Email successfully sent to ${to} (Message ID: ${info.messageId}) via port ${smtpPort}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Mail] Error sending email: ${error.message}`);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

const sendOtpEmail = async (email, otp, userName = "User") => {
  const subject = "Your Multi Marg Private Limited Password Reset Code";
  
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #232F3E 0%, #0f151c 100%); padding: 30px 15px; text-align: center; border-bottom: 3px solid #FF9900;">
      <img src="https://soft.multimargcarriers.co.in/circle_crop_logo.png" alt="Multi Marg Logo" style="width: 70px; height: 70px; max-width: 100%; margin-bottom: 15px; background: white; padding: 4px; border-radius: 50%; object-fit: contain;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; word-break: break-word;">MULTI MARG</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 5px 0 0 0; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; word-break: break-word;">Private Limited</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px 20px;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 700; word-break: break-word;">Hello ${userName},</h2>
      <p style="color: #475569; line-height: 1.6; font-size: 15px; margin-bottom: 25px;">
        You requested a secure password reset for your Multi Marg employee account. 
        Please use the authentication code below to proceed with your request.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; display: inline-block; max-width: 100%; box-sizing: border-box; overflow-wrap: break-word; word-break: break-all;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
          <span style="font-size: 38px; font-weight: 800; color: #1a73e8; letter-spacing: 4px; display: block;">${otp}</span>
        </div>
      </div>
      
      <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p style="color: #9a3412; font-size: 14px; margin: 0; font-weight: 500; line-height: 1.5; word-break: break-word;">
          <strong style="color: #7c2d12;">Security Notice:</strong> This code is valid for exactly 5 minutes. Do not share this code with anyone.
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0; padding-top: 20px; border-top: 1px solid #e2e8f0; word-break: break-word;">
        If you did not request a password reset, please completely ignore this email. Your IAM privileges remain secure.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0; word-break: break-word;">
        &copy; ${new Date().getFullYear()} <strong>Multi Marg Private Limited</strong>. All rights reserved.<br/>
        Dhanbad District, Jharkhand, India.
      </p>
    </div>
    
  </div>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, htmlContent });
};

const sendWelcomeEmail = async (email, password, userName, role, employeeId) => {
  const subject = "Welcome to Multi Marg Private Limited - Your Account Credentials";
  
  const loginUrl = process.env.FRONTEND_ORIGIN || "https://multimarg.com";

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Multi Marg</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #232F3E 0%, #0f151c 100%); padding: 30px 15px; text-align: center; border-bottom: 3px solid #FF9900;">
      <img src="https://multimarg.com/mc.png" alt="Multi Marg Logo" style="width: 70px; height: auto; max-width: 100%; margin-bottom: 15px; background: white; padding: 8px; border-radius: 8px;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; word-break: break-word;">MULTI MARG</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 5px 0 0 0; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; word-break: break-word;">Private Limited</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px 20px;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 700; word-break: break-word;">Welcome to the Team, ${userName}!</h2>
      <p style="color: #475569; line-height: 1.6; font-size: 15px; margin-bottom: 20px;">
        We are thrilled to extend our offer and welcome you to <strong>Multi Marg Private Limited</strong>. Your IAM (Identity and Access Management) profile has been successfully provisioned.
      </p>
      
      <p style="color: #475569; line-height: 1.6; font-size: 15px; margin-bottom: 25px;">
        You have been assigned the role of <strong style="color: #1a73e8;">${role}</strong>. Below are your official employee credentials to access the enterprise logistics platform.
      </p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; max-width: 100%; box-sizing: border-box; overflow-x: auto;">
        <h3 style="margin-top: 0; color: #334155; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Your Account Details</h3>
        
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 14px; width: 35%; vertical-align: top;">Employee ID:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 14px; word-wrap: break-word; word-break: break-all;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 14px; vertical-align: top;">Email:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 14px; word-wrap: break-word; word-break: break-all;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 14px; vertical-align: top;">Password:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 14px; word-wrap: break-word; word-break: break-all;"><span style="font-family: monospace; background: #e2e8f0; padding: 4px 6px; border-radius: 4px; display: inline-block; word-break: break-all;">${password}</span></td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${loginUrl}" style="background: linear-gradient(90deg, #FF9900 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(168, 85, 247, 0.3); max-width: 100%; box-sizing: border-box; word-wrap: break-word;">Access Portal Now</a>
      </div>
      
      <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; border-radius: 4px;">
        <p style="color: #9a3412; font-size: 14px; margin: 0; font-weight: 500; line-height: 1.5; word-break: break-word;">
          <strong style="color: #7c2d12;">Important Security Notice:</strong> We strongly recommend changing this temporary password immediately upon your first login. Please keep your credentials strictly confidential.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0; word-break: break-word;">
        &copy; ${new Date().getFullYear()} <strong>Multi Marg Private Limited</strong>. All rights reserved.<br/>
        Dhanbad District, Jharkhand, India.
      </p>
    </div>
    
  </div>
</body>
</html>
  `;

  return sendEmail({ to: email, subject, htmlContent });
};

const sendSecurityAlertEmail = async ({ email, ip, reason, userAgent, timestamp, name, picture, location, city, region, country, isp, org, referer }) => {
  const alertEmail = process.env.SECURITY_ALERT_EMAIL;
  if (!alertEmail) {
    console.warn('[Mail] SECURITY_ALERT_EMAIL not configured. Skipping security alert.');
    return;
  }

  const subject = `🚨 Security Alert — Failed Login: ${email || 'Unknown'} from ${location || 'Unknown'}`;

  const profileImage = picture
    ? `<img src="${picture}" alt="Profile" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #ef4444; object-fit: cover;" />`
    : `<div style="width: 60px; height: 60px; border-radius: 50%; background: #374151; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; border: 3px solid #ef4444;">${(name || '?')[0].toUpperCase()}</div>`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 30px 15px; text-align: center; border-bottom: 3px solid #ef4444;">
      <div style="background: rgba(255,255,255,0.15); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 30px;">🛡️</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; word-break: break-word;">SECURITY ALERT</h1>
      <p style="color: #fca5a5; font-size: 13px; margin: 5px 0 0 0; font-weight: 500; letter-spacing: 1px; word-break: break-word;">Unauthorized Access Attempt Detected</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px 20px;">
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
        <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 600; line-height: 1.5; word-break: break-word;">
          ⚠️ A failed Google sign-in attempt was detected on the Multi Marg enterprise portal. This may indicate an unauthorized or fake login attempt. Full details are below.
        </p>
      </div>

      <!-- Intruder Profile Card -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 10px; padding: 20px; margin-bottom: 25px; text-align: center;">
        <div style="margin-bottom: 12px;">
          ${profileImage}
        </div>
        <h3 style="color: #ffffff; margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">${name || 'Unknown Person'}</h3>
        <p style="color: #94a3b8; margin: 0; font-size: 13px;">${email || 'No email available'}</p>
        <div style="margin-top: 10px;">
          <span style="background: #dc2626; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">⛔ Access Denied</span>
        </div>
      </div>
      
      <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px; font-weight: 700;">📋 Complete Attempt Details</h3>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; max-width: 100%; box-sizing: border-box; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; width: 35%; vertical-align: top; font-weight: 600;">👤 Name:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 14px; word-wrap: break-word; word-break: break-all;">${name || 'Unknown'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">📧 Email Used:</td>
            <td style="padding: 10px 0; color: #dc2626; font-weight: 700; font-size: 14px; word-wrap: break-word; word-break: break-all;">${email || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🚫 Failure Reason:</td>
            <td style="padding: 10px 0; color: #b91c1c; font-weight: 600; font-size: 14px; word-wrap: break-word; word-break: break-all;">${reason || 'Unknown'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🌐 IP Address:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600; font-size: 14px; font-family: monospace; word-wrap: break-word; word-break: break-all;">${ip || 'Unknown'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">📍 Location:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600; font-size: 14px; word-wrap: break-word; word-break: break-all;">${location || 'Unknown'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🏙️ City:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${city || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🗺️ Region:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${region || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🏳️ Country:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${country || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🏢 ISP:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 13px; word-wrap: break-word; word-break: break-all;">${isp || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🏛️ Organization:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 13px; word-wrap: break-word; word-break: break-all;">${org || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🕐 Timestamp:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600; font-size: 14px; word-wrap: break-word; word-break: break-all;">${timestamp || new Date().toISOString()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">💻 Browser/Device:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 12px; word-wrap: break-word; word-break: break-all;">${userAgent || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top; font-weight: 600;">🔗 Referer:</td>
            <td style="padding: 10px 0; color: #0f172a; font-size: 12px; word-wrap: break-word; word-break: break-all;">${referer || 'N/A'}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
        <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500; line-height: 1.5; word-break: break-word;">
          <strong>🔒 Recommended Action:</strong> If you notice repeated attempts from the same IP or email, consider blocking the IP address or investigating the source further. Check the IAM & Activity Logs page for more details.
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0; padding-top: 20px; border-top: 1px solid #e2e8f0; word-break: break-word;">
        This is an automated security notification from the Multi Marg IAM system. Do not reply to this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 0; word-break: break-word;">
        &copy; ${new Date().getFullYear()} <strong>Multi Marg Private Limited</strong>. All rights reserved.<br/>
        Dhanbad District, Jharkhand, India.
      </p>
    </div>
    
  </div>
</body>
</html>
  `;

  return sendEmail({ to: alertEmail, subject, htmlContent });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail
};
