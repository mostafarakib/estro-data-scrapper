import { Client, Databases, Query } from "appwrite";
import CONFIG from "../config/config.js";

export class DatabaseService {
  client = new Client();
  databases;

  constructor() {
    this.client
      .setEndpoint(CONFIG.appwrite.url)
      .setProject(CONFIG.appwrite.projectId);
    // .setKey(CONFIG.appwrite.apiKey);

    this.databases = new Databases(this.client);
  }

  async getLastBetData() {
    try {
      const documents = await this.databases.listDocuments(
        CONFIG.appwrite.databaseId,
        CONFIG.appwrite.collectionId,
        [Query.orderDesc("$createdAt"), Query.limit(1)]
      );

      if (documents.documents.length > 0) {
        return documents.documents[0];
      }
      return null;
    } catch (error) {
      console.error("Error fetching last bet data:", error);
      return null;
    }
  }

  async storeBetData(betData) {
    try {
      const document = await this.databases.createDocument(
        CONFIG.appwrite.databaseId,
        CONFIG.appwrite.collectionId,
        "unique()",
        {
          hash: betData.hash,
          matchNames: betData.matchNames,
          matchInfo: betData.matchInfo,
          matchTip: betData.matchTip,
          matchOdds: betData.matchOdds,
          freeBetContent: betData.freeBetContent,
          hasNoBasicTips: betData.hasNoBasicTips,
          vTabContent: betData.vTabContent,
          timestamp: betData.timestamp,
          fullHtml: betData.fullHtml,
        }
      );

      console.log("✅ Data stored successfully in Appwrite");
      return document;
    } catch (error) {
      console.error("❌ Error storing data in Appwrite:", error);
      throw error;
    }
  }

  // Check if Appwrite is properly configured
  async testConnection() {
    try {
      await this.databases.listDocuments(
        CONFIG.appwrite.databaseId,
        CONFIG.appwrite.collectionId,
        [Query.limit(1)]
      );
      console.log("✅ Appwrite connection successful");
      return true;
    } catch (error) {
      console.error("❌ Appwrite connection failed:", error);
      return false;
    }
  }
}

const databaseService = new DatabaseService();
export default databaseService;
