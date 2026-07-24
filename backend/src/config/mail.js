const nodemailer = require("nodemailer");

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoLogin = process.env.BREVO_SMTP_LOGIN || 'b31e39001@smtp-brevo.com';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: brevoLogin,
    pass: brevoApiKey
  }
});

const sendEmail = async ({ to, subject, htmlContent }) => {
  try {
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'praveen.pr105@gmail.com';
    const info = await transporter.sendMail({
      from: `"Multimarg Carriers" <${senderEmail}>`,
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
  const subject = "Your Multimarg Carriers Password Reset Code";
  
  const htmlContent = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0ea5e9; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">MULTIMARG CARRIERS</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Transport Management System</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Hello ${userName},</h3>
        <p style="color: #475569; line-height: 1.6; font-size: 15px;">
          We received a request to reset the password for your Multimarg Carriers account. 
          Use the verification code below to securely reset your password:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; display: inline-block;">
            <span style="font-size: 32px; font-weight: 800; color: #0284c7; letter-spacing: 6px;">${otp}</span>
          </div>
        </div>
        
        <p style="color: #ef4444; font-size: 14px; text-align: center; margin-bottom: 0;">
          <strong>Note:</strong> This code will expire in 10 minutes.
        </p>
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
            If you did not request a password reset, please ignore this email or contact support if you have concerns. Do not share this code with anyone.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Multimarg Carriers. All rights reserved.<br/>
        This is an automated message. Please do not reply to this email.
      </div>
    </div>
  `;

  return sendEmail({ to: email, subject, htmlContent });
};

module.exports = {
  sendEmail,
  sendOtpEmail
};
