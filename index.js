import databaseService from "./appwrite/services.js";
import CONFIG from "./config/config.js";
import mailerService from "./utills/mailer.js";
import scraperService from "./utills/scrapper.js";

// Main monitoring function
async function checkForNewBets() {
  try {
    console.log(`🚀 Starting bet check at ${new Date().toISOString()}`);

    const appwriteWorking = await databaseService.testConnection();
    if (!appwriteWorking) {
      console.log("⚠️  Appwrite not configured, will skip database operations");
    }

    const currentData = await scraperService.extractBetData();
    if (!currentData) {
      console.log("❌ Failed to extract data from website");
      return;
    }

    let previousData = null;

    if (appwriteWorking) {
      previousData = await databaseService.getLastBetData();
    }
    // First run detection
    const isFirstRun = !previousData || !previousData.hash;

    if (isFirstRun) {
      console.log("📝 First run - saving initial data");
      if (appwriteWorking) {
        await databaseService.storeBetData(currentData);
      }

      // send a welcome email on fiest
      await mailerService.sendTestEmail();
      return;
    }

    // Check if content has changed
    if (previousData.hash !== currentData.hash) {
      console.log("🎯 New bet detected!");
      console.log(`   Previous hash: ${previousData.hash}`);
      console.log(`   Current hash: ${currentData.hash}`);

      // send notification email
      await mailerService.sendNotification(currentData);

      // store new data in appwrite
      if (appwriteWorking) {
        await databaseService.storeBetData(currentData);
      }
    } else {
      console.log("📊 No new bets found");
    }

    console.log(`✅ Check completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("❌ Error in monitoring:", error.message);
    // Send error notification email
    try {
      const errorMailOptions = {
        from: CONFIG.email.user,
        to: CONFIG.email.to,
        subject: "❌ Bet Monitor Error",
        html: `
                    <h2>Error in Bet Monitor</h2>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                    <p>Please check the GitHub Actions logs for more details.</p>
                `,
      };

      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        service: CONFIG.email.service,
        auth: {
          user: CONFIG.email.user,
          pass: CONFIG.email.pass,
        },
      });

      await transporter.sendMail(errorMailOptions);
    } catch (emailError) {
      console.error("Failed to send error email:", emailError.message);
    }
  }
}

// Command line interface
const command = process.argv[2];

async function main() {
  switch (command) {
    case "test-email":
      console.log("🧪 Testing email configuration...");
      await mailerService.sendTestEmail();
      break;
    case "test-appwrite":
      console.log("🧪 Testing Appwrite connection...");
      await databaseService.testConnection();
      break;
    case "check-once":
    default:
      await checkForNewBets();
      break;
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down bet monitor...");
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
