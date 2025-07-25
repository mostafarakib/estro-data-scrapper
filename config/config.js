import "dotenv/config";

const CONFIG = {
  url: process.env.URL,
  email: {
    service: process.env.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
    to: process.env.EMAIL_RECIPIENTS,
  },
  appwrite: {
    url: process.env.APPWRITE_URL,
    projectId: process.env.APPWRITE_PROJECT_ID,
    databaseId: process.env.APPWRITE_DATABASE_ID,
    collectionId: process.env.APPWRITE_COLLECTION_ID,
  },
};

export default CONFIG;
