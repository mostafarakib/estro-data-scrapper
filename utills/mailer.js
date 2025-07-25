import nodemailer from "nodemailer";
import CONFIG from "../config/config.js";

class MailerService {
  constructor() {
    this.transport = nodemailer.createTransport({
      service: CONFIG.email.service,
      auth: {
        user: CONFIG.email.user,
        pass: CONFIG.email.pass,
      },
    });
  }

  async sendNotification(betData) {
    let subject = "🎯 EstrobBet Update!";
    let htmlContent = "";

    if (betData.matchInfo) {
      // New bet available
      subject = "🎯 New Bet Suggestion Available!";
      htmlContent = `
                <h2>New Bet Suggestion Posted!</h2>
                <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h3 style="color: #2c5aa0;">📈 Free Bet of the Day</h3>
                    <p><strong>Match:</strong> ${betData.matchInfo}</p>
                    ${
                      betData.matchTip
                        ? `<p><strong>Tip:</strong> ${betData.matchTip}</p>`
                        : ""
                    }
                    ${
                      betData.matchOdds
                        ? `<p><strong>Odds:</strong> ${betData.matchOdds}</p>`
                        : ""
                    }
                </div>
            `;
    } else {
      // General update
      htmlContent = `
                <h2>EstrobBet Content Updated</h2>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <p>The betting page has been updated. Please check the website for details.</p>
                </div>
            `;
    }

    htmlContent += `
            <hr>
            <p><strong>🌐 View Full Details:</strong> <a href="${CONFIG.url}" style="color: #007bff;">Visit EstrobBet</a></p>
            <p style="color: #666; font-size: 12px;"><em>Timestamp: ${betData.timestamp}</em></p>
        `;

    const mailOptions = {
      from: CONFIG.email.user,
      to: CONFIG.email.to,
      subject: subject,
      html: htmlContent,
    };

    try {
      await this.transport.sendMail(mailOptions);
      console.log("✅ Notification email sent successfully!");
      return true;
    } catch (error) {
      console.error("❌ Error sending email:", error.message);
      return false;
    }
  }

  async sendTestEmail() {
    const mailOptions = {
      from: CONFIG.email.user,
      to: CONFIG.email.to,
      subject: "🧪 Bet Monitor Test Email",
      html: `
                <h2>Test Email</h2>
                <p>Your bet monitoring script is working correctly!</p>
                <p>You will receive notifications when new bets are posted.</p>
                <p><em>Sent from GitHub Actions at ${new Date().toISOString()}</em></p>
            `,
    };

    try {
      await this.transport.sendMail(mailOptions);
      console.log("✅ Test email sent successfully!");
      return true;
    } catch (error) {
      console.error("❌ Error sending test email:", error.message);
      return false;
    }
  }
}

const mailerService = new MailerService();
export default mailerService;
