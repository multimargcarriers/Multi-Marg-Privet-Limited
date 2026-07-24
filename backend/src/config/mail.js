const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const smtpPort = process.env.SMTP_PORT || 587;
const smtpUser = process.env.SMTP_USER || process.env.BREVO_SMTP_LOGIN || 'b31e39001@smtp-brevo.com';
const smtpPass = process.env.SMTP_PASS || process.env.BREVO_API_KEY;
const senderEmail = process.env.SMTP_FROM || process.env.BREVO_SENDER_EMAIL || 'praveen.pr105@gmail.com';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort == 465, // true for 465, false for 587
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
    
    console.log(`[Mail] Email successfully sent to ${to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Mail] Error sending email: ${error.message}`);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

const sendOtpEmail = async (email, otp, userName = "User") => {
  const subject = "Your Multi Marg Private Limited Password Reset Code";
  
  const htmlContent = `
    <div style="font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f4f7fa; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
        <img src="https://soft.multimargcarriers.co.in/mc.png" alt="Multi Marg Logo" style="width: 100px; height: auto; margin-bottom: 15px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.2));" />
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">MULTI MARG</h1>
        <p style="color: #bfdbfe; font-size: 15px; margin: 8px 0 0 0; font-weight: 500; letter-spacing: 0.5px;">PRIVATE LIMITED</p>
      </div>
      
      <!-- Body -->
      <div style="background-color: #ffffff; padding: 40px; border-bottom: 2px solid #f1f5f9;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700;">Hello ${userName},</h2>
        <p style="color: #475569; line-height: 1.7; font-size: 16px; margin-bottom: 30px;">
          We received a request to securely reset the password for your Multi Marg Private Limited account. 
          Please use the verification code below to proceed:
        </p>
        
        <div style="text-align: center; margin: 35px 0;">
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #7dd3fc; border-radius: 12px; padding: 25px 40px; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
            <span style="font-size: 42px; font-weight: 900; color: #0284c7; letter-spacing: 12px; display: block; margin-right: -12px;">${otp}</span>
          </div>
        </div>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; border-radius: 4px; margin-bottom: 25px;">
          <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 500;">
            <strong style="color: #7f1d1d;">Security Notice:</strong> This code is valid for exactly 10 minutes. Do not share this code with anyone.
          </p>
        </div>
        
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          If you did not request a password reset, please completely ignore this email. Your account remains secure.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 30px 40px; text-align: center;">
        <a href="https://soft.multimargcarriers.co.in" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 25px; transition: background-color 0.3s;">Visit Our Website</a>
        
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
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
