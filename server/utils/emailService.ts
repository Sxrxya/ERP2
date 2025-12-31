/**
 * Email Notification Service
 * 
 * Supports:
 * - SendGrid
 * - Nodemailer (SMTP)
 * - Multiple email templates
 */

import nodemailer from "nodemailer";

// Email service configuration
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || "smtp";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@internship-erp.com";

// Create transporter based on service
let transporter: nodemailer.Transporter;

if (EMAIL_SERVICE === "sendgrid" && SENDGRID_API_KEY) {
    // SendGrid configuration
    transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        auth: {
            user: "apikey",
            pass: SENDGRID_API_KEY,
        },
    });
} else {
    // SMTP configuration (Gmail, Outlook, etc.)
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn("Email credentials not configured. Email notifications will be disabled.");
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for 465, false for other ports
        auth: SMTP_USER && SMTP_PASS ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
        } : undefined,
    });
}

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    if (!SMTP_USER && !SENDGRID_API_KEY) {
        console.log("Email not sent - no email service configured");
        return false;
    }

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || stripHtml(options.html),
        });

        console.log(`Email sent to ${options.to}: ${options.subject}`);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}

/**
 * Email Templates
 */

export async function sendWelcomeEmail(email: string, name: string, role: string): Promise<boolean> {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Internship ERP!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Your account has been successfully created as a <strong>${role}</strong>.</p>
          <p>You can now log in to your dashboard and start managing your internship activities.</p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:8080'}/login" class="button">Login to Dashboard</a>
          <h3>Getting Started:</h3>
          <ul>
            ${role === 'student' ? '<li>View your attendance records</li><li>Submit assigned tasks</li><li>Track your progress</li>' : ''}
            ${role === 'faculty' ? '<li>Mark student attendance</li><li>Create and assign tasks</li><li>Monitor student progress</li>' : ''}
            ${role === 'admin' ? '<li>Manage users and roles</li><li>View system analytics</li><li>Generate reports</li>' : ''}
          </ul>
          <p>If you have any questions, please contact your administrator.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Internship ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return sendEmail({
        to: email,
        subject: "Welcome to Internship ERP",
        html,
    });
}

export async function sendTaskAssignedEmail(
    email: string,
    studentName: string,
    taskTitle: string,
    taskDescription: string,
    deadline: string
): Promise<boolean> {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
        .task-box { background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .deadline { color: #dc2626; font-weight: bold; }
        .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 New Task Assigned</h1>
        </div>
        <div class="content">
          <h2>Hello ${studentName},</h2>
          <p>A new task has been assigned to you.</p>
          <div class="task-box">
            <h3>${taskTitle}</h3>
            <p>${taskDescription}</p>
            <p class="deadline">⏰ Deadline: ${deadline}</p>
          </div>
          <p>Please complete this task before the deadline.</p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:8080'}/student/tasks" class="button">View Tasks</a>
        </div>
      </div>
    </body>
    </html>
  `;

    return sendEmail({
        to: email,
        subject: `New Task Assigned: ${taskTitle}`,
        html,
    });
}

export async function sendAttendanceAlertEmail(
    email: string,
    studentName: string,
    attendancePercentage: number,
    presentDays: number,
    totalDays: number
): Promise<boolean> {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
        .stats { background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .percentage { font-size: 36px; font-weight: bold; color: #dc2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Attendance Alert</h1>
        </div>
        <div class="content">
          <h2>Hello ${studentName},</h2>
          <p>Your attendance has fallen below the required threshold.</p>
          <div class="stats">
            <p class="percentage">${attendancePercentage.toFixed(1)}%</p>
            <p>Present Days: ${presentDays} out of ${totalDays}</p>
          </div>
          <p><strong>Action Required:</strong> Please ensure regular attendance to maintain good academic standing.</p>
          <p>If you have any concerns, please contact your faculty coordinator.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return sendEmail({
        to: email,
        subject: "⚠️ Attendance Alert - Action Required",
        html,
    });
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
    if (!SMTP_USER && !SENDGRID_API_KEY) {
        console.log("Email service not configured");
        return false;
    }

    try {
        await transporter.verify();
        console.log("Email service is ready");
        return true;
    } catch (error) {
        console.error("Email configuration error:", error);
        return false;
    }
}
