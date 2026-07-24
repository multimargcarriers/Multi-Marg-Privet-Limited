const nodemailer = require("nodemailer");

// Use port 2525 specifically because Render free tier blocks 25, 465, and 587, but allows 2525.
const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const smtpPort = process.env.SMTP_PORT || 2525;
const smtpUser = process.env.SMTP_USER || process.env.BREVO_SMTP_LOGIN || 'b31e39001@smtp-brevo.com';
const smtpPass = process.env.SMTP_PASS || process.env.BREVO_API_KEY;
const senderEmail = process.env.SMTP_FROM || process.env.BREVO_SENDER_EMAIL || 'praveen.pr105@gmail.com';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort == 465, // true for 465, false for other ports
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

const sendEmail = async ({ to, subject, htmlContent }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Multi Marg" <${senderEmail}>`,
      to: to,
      subject: subject,
      html: htmlContent
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
    <div style="font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #232F3E 0%, #0f151c 100%); padding: 35px 20px; text-align: center; border-bottom: 3px solid #FF9900;">
        <img src="https://soft.multimargcarriers.co.in/mc.png" alt="Multi Marg Logo" style="width: 80px; height: auto; margin-bottom: 15px; background: white; padding: 8px; border-radius: 8px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">MULTI MARG</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 5px 0 0 0; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;">Private Limited</p>
      </div>
      
      <!-- Body -->
      <div style="background-color: #ffffff; padding: 40px;">
        <h2 style="color: #1e293b; margin-top: 0; font-size: 22px; font-weight: 700;">Hello ${userName},</h2>
        <p style="color: #475569; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
          You requested a secure password reset for your Multi Marg administrative account. 
          Please use the authentication code below to proceed with your request.
        </p>
        
        <div style="text-align: center; margin: 35px 0;">
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 25px 40px; display: inline-block;">
            <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
            <span style="font-size: 46px; font-weight: 800; color: #1a73e8; letter-spacing: 8px; display: block; margin-right: -8px;">${otp}</span>
          </div>
        </div>
        
        <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px 20px; border-radius: 4px; margin-bottom: 25px;">
          <p style="color: #9a3412; font-size: 14px; margin: 0; font-weight: 500; line-height: 1.5;">
            <strong style="color: #7c2d12;">Security Notice:</strong> This code is valid for exactly 5 minutes. Do not share this code with anyone.
          </p>
        </div>
        
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          If you did not request a password reset, please completely ignore this email. Your IAM privileges remain secure.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 25px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
          &copy; ${new Date().getFullYear()} <strong>Multi Marg Private Limited</strong>. All rights reserved.<br/>
          Dhanbad District, Jharkhand, India.
        </p>
      </div>
      
    </div>
  `;

  return sendEmail({ to: email, subject, htmlContent });
};

module.exports = {
  sendEmail,
  sendOtpEmail
};
