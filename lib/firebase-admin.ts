import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

let isInitialized = false;

export function getFirebaseAdmin(): typeof admin | null {
  if (isInitialized && admin.apps.length > 0) {
    return admin;
  }

  try {
    // 1. Check for service account JSON file in root or data directory
    const rootServiceAccountPath = path.join(process.cwd(), "firebase-service-account.json");
    const dataServiceAccountPath = path.join(process.cwd(), "data", "firebase-service-account.json");
    const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    let credential: admin.credential.Credential | null = null;

    if (customPath && fs.existsSync(customPath)) {
      credential = admin.credential.cert(customPath);
    } else if (fs.existsSync(rootServiceAccountPath)) {
      credential = admin.credential.cert(rootServiceAccountPath);
    } else if (fs.existsSync(dataServiceAccountPath)) {
      credential = admin.credential.cert(dataServiceAccountPath);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = admin.credential.cert(parsed);
      } catch (_) {}
    }

    if (credential) {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential,
          projectId: "rfq-app-815c3",
        });
      }
      isInitialized = true;
      return admin;
    } else {
      // Fallback initialization with project ID (works if running under GCP / default credentials)
      if (admin.apps.length === 0) {
        admin.initializeApp({
          projectId: "rfq-app-815c3",
        });
      }
      isInitialized = true;
      return admin;
    }
  } catch (err) {
    console.warn("[Firebase Admin] Initialization notice:", err);
    return null;
  }
}
