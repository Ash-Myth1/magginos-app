// src/config/env.ts
// Validates VITE_ environment variables at startup.
// Firebase vars are required (will throw); EmailJS vars warn only.

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function required(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${key}.\n` +
        `   Add it to your .env (or .env.local) file and restart the dev server.`,
    );
  }
  return value as string;
}

function optional(key: string, label: string): string | undefined {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    console.warn(
      `⚠️  Optional env variable ${key} (${label}) is not set. Related features will be disabled.`,
    );
  }
  return value;
}

/* ------------------------------------------------------------------ */
/*  Firebase (required)                                               */
/* ------------------------------------------------------------------ */

const firebase = {
  apiKey:            required('VITE_FIREBASE_API_KEY'),
  authDomain:        required('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId:         required('VITE_FIREBASE_PROJECT_ID'),
  storageBucket:     required('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: required('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             required('VITE_FIREBASE_APP_ID'),
} as const;

/* ------------------------------------------------------------------ */
/*  EmailJS (optional – warn only)                                    */
/* ------------------------------------------------------------------ */

const emailjs = {
  serviceId:         optional('VITE_EMAILJS_SERVICE_ID',             'EmailJS service ID'),
  newOrderTemplate:  optional('VITE_EMAILJS_TEMPLATE_NEW_ORDER',     'EmailJS new-order template'),
  deliveredTemplate: optional('VITE_EMAILJS_TEMPLATE_DELIVERED',     'EmailJS delivered template'),
  publicKey:         optional('VITE_EMAILJS_PUBLIC_KEY',              'EmailJS public key'),
} as const;

/* ------------------------------------------------------------------ */
/*  Validated config export                                           */
/* ------------------------------------------------------------------ */

export const env = {
  firebase,
  emailjs,
  /** true when running `vite build` */
  isProd: import.meta.env.PROD as boolean,
  /** true when running `vite` / `vite dev` */
  isDev:  import.meta.env.DEV  as boolean,
  mode:   import.meta.env.MODE as string,
} as const;

export default env;
