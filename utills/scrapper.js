import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import CONFIG from "../config/config.js";

class ScraperService {
  // Extract bet data from the webpage
  async extractBetData() {
    try {
      console.log("Checking for new bets...");
      const response = await axios.get(CONFIG.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 30000, // 30 second timeout
      });

      const $ = cheerio.load(response.data);

      // Extract data from the free bet of the day tab
      const freeBetTab = $("#free-bet-of-the-day-tab");
      const freeBetContent = freeBetTab.text().trim();
      let matchInfo = "";
      let matchTip = "";
      let matchOdds = "";
      let matchNames = "";

      if (freeBetTab.length > 0) {
        // Extract ONLY the match names from the free bet tab (first <b> tag)
        const firstBoldElement = freeBetTab.find("b").first();
        matchNames = firstBoldElement.text().trim();

        const freeBetContent = freeBetTab.text().trim();
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

      const betData = {
        freeBetContent: freeBetContent,
        matchNames: matchNames,
        matchInfo: matchInfo,
        matchTip: matchTip,
        matchOdds: matchOdds,
        timestamp: new Date().toISOString(),
      };

      // Create a hash of the main content to detect changes
      const contentHash = crypto
        .createHash("md5")
        .update(freeBetContent)
        .digest("hex");

      betData.hash = contentHash;

      // Log the output
      console.log("📊 Extracted data:");
      console.log(`   Match: ${matchNames || "Not found"}`);
      console.log(`   Tip: ${matchTip || "Not found"}`);
      console.log(`   Odds: ${matchOdds || "Not found"}`);
      console.log(`   Hash: ${contentHash}`);

      return betData;
    } catch (error) {
      console.error("Error extracting bet data:", error.message);
      return null;
    }
  }
}

const scraperService = new ScraperService();
export default scraperService;
