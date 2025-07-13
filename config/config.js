import "dotenv/config";

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
  appwrite: {
    url: process.env.APPWRITE_URL,
    projectId: process.env.APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID,
    collectionId: process.env.APPWRITE_COLLECTION_ID,
  },
};

export default CONFIG;
