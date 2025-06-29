const axios = require("axios");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

// Configuration
const CONFIG = {
  url: process.env.URL,
  checkInterval: process.env.INTERVAL_TIME * 60 * 1000,
  dataFile: "last_bet_data.json",
  email: {
    service: process.env.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
    to: process.env.EMAIL_RECIPIENTS,
  },
};

const transporter = nodemailer.createTransport({
  service: CONFIG.email.service,
  auth: {
    user: CONFIG.email.user,
    pass: CONFIG.email.pass,
  },
});

// Function to extract bet data from the webpage
async function extractBetData() {
  try {
    console.log("Checking for new bets...");
    const response = await axios.get(CONFIG.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Extract data from the free bet of the day tab
    const freeBetTab = $("#free-bet-of-the-day-tab");
    const freeBetContent = freeBetTab.text().trim();

    // Extract specific bet details from the free bet tab
    const freeBetHtml = freeBetTab.html() || "";
    let matchInfo = "";
    let matchTip = "";
    let matchOdds = "";
    let matchNames = "";

    if (freeBetContent) {
      // Extract ONLY the match names from the free bet tab (first <b> tag)
      const firstBoldElement = freeBetTab.find("b").first();
      matchNames = firstBoldElement.text().trim();

      const tipRegex = /Match Tip:\s*([\s\S]*?)(?=Match Odds:|\n|$)/i;
      const oddsRegex = /Match Odds:\s*([\s\S]*?)(?=oddsResults:|\n|$)/i;

      const tipMatch = freeBetContent.match(tipRegex);
      const oddsMatch = freeBetContent.match(oddsRegex);

      matchTip = tipMatch ? tipMatch[1].trim() : "";
      matchOdds = oddsMatch ? oddsMatch[1].trim() : "";

      // Clean up the extracted data
      matchTip = matchTip.replace(/\s+/g, " ").trim();
      matchOdds = matchOdds.replace(/\s+/g, " ").trim();

      if (matchNames && matchTip) {
        matchInfo = `${matchNames} - ${matchTip}${
          matchOdds ? ` (${matchOdds})` : ""
        }`;
      }
    }

    // Also check for "No Basic Tips" message in other-markets-tab
    const otherMarketsTab = $("#other-markets-tab");
    const hasNoBasicTips = otherMarketsTab.text().includes("(No Basic Tips)");

    // Check V-tab for additional bets
    const vTabContent = $("#V-tab").text().trim();

    const betData = {
      freeBetContent: freeBetContent,
      matchNames: matchNames,
      matchInfo: matchInfo,
      matchTip: matchTip,
      matchOdds: matchOdds,
      hasNoBasicTips: hasNoBasicTips,
      vTabContent: vTabContent,
      timestamp: new Date().toISOString(),
      // Get the full HTML of the tabs for detailed comparison
      fullHtml: $(".eael-tabs-content").html(),
    };

    // Create a hash of the main content to detect changes
    const contentForHash =
      freeBetContent + vTabContent + hasNoBasicTips.toString();
    const contentHash = crypto
      .createHash("md5")
      .update(contentForHash)
      .digest("hex");

    betData.hash = contentHash;

    //log the output
    console.log("📊 Extracted data:");
    console.log(`   Match: ${matchNames || "Not found"}`);
    console.log(`   Tip: ${matchTip || "Not found"}`);
    console.log(`   Odds: ${matchOdds || "Not found"}`);
    console.log(`   No Basic Tips: ${hasNoBasicTips}`);

    return betData;
  } catch (error) {
    console.error("Error extracting bet data:", error.message);
    return null;
  }
}

// Function to load previous bet data
async function loadPreviousData() {
  try {
    const data = await fs.readFile(CONFIG.dataFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is corrupted, return empty object
    return {};
  }
}

// Function to save current bet data
async function saveCurrentData(data) {
  try {
    await fs.writeFile(CONFIG.dataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving data:", error.message);
  }
}

// Function to send email notification
async function sendNotification(betData) {
  let subject = "🎯 EstrobBet Update!";
  let htmlContent = "";

  if (betData.matchInfo && !betData.hasNoBasicTips) {
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
  } else if (betData.hasNoBasicTips) {
    // No basic tips available
    subject = "📊 EstrobBet: No Basic Tips Today";
    htmlContent = `
      <h2>No Basic Tips Available Today</h2>
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <p>🔒 No basic tips are available today. Only premium content for Estro Experts members.</p>
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

  // Add V-tab content if available
  if (betData.vTabContent && betData.vTabContent !== betData.freeBetContent) {
    htmlContent += `
      <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h3 style="color: #2d5a2d;">📋 Additional Tips</h3>
        <p><em>Check the V-tab section for more betting options.</em></p>
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
    await transporter.sendMail(mailOptions);
    console.log("✅ Notification email sent successfully!");
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
  }
}

// Function to send test email
async function sendTestEmail() {
  const mailOptions = {
    from: CONFIG.email.user,
    to: CONFIG.email.to,
    subject: "🧪 Bet Monitor Test Email",
    html: `
      <h2>Test Email</h2>
      <p>Your bet monitoring script is working correctly!</p>
      <p>You will receive notifications when new bets are posted.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Test email sent successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error sending test email:", error.message);
    return false;
  }
}

// Main monitoring function
async function checkForNewBets() {
  try {
    const currentData = await extractBetData();
    if (!currentData) {
      console.log("❌ Failed to extract data from website");
      return;
    }

    const previousData = await loadPreviousData();

    // First run detection
    const isFirstRun = !previousData.hash;

    if (isFirstRun) {
      console.log("📝 First run - saving initial data");
      await saveCurrentData(currentData);
      return;
    }

    // Check if content has changed
    if (previousData.hash !== currentData.hash) {
      console.log("🎯 New bet detected!");

      // Only send notification if we have previous data (not first run)
      if (previousData.hash) {
        await sendNotification(currentData);
      } else {
        console.log("📝 First run - saving initial data");
      }

      await saveCurrentData(currentData);
    } else {
      console.log("📊 No new bets found");
    }
  } catch (error) {
    console.error("❌ Error in monitoring:", error.message);
  }
}

// Start monitoring
function startMonitoring() {
  console.log(`🚀 Starting bet monitor...`);
  console.log(`📍 URL: ${CONFIG.url}`);
  console.log(`⏰ Check interval: ${CONFIG.checkInterval / 1000 / 60} minutes`);
  console.log(`📧 Notifications to: ${CONFIG.email.to}`);

  // Run immediately
  checkForNewBets();

  // Then run at intervals
  setInterval(checkForNewBets, CONFIG.checkInterval);
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case "test-email":
    sendTestEmail();
    break;
  case "check-once":
    checkForNewBets();
    break;
  case "start":
  default:
    startMonitoring();
    break;
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down bet monitor...");
  process.exit(0);
});
