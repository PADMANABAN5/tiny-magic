import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";

// ✅ Import Sentry
import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react"; // 👈 new API in v8
import { replayIntegration } from "@sentry/react";  


// ✅ Initialize Sentry
Sentry.init({
  dsn: "https://cc1f53ab98b5d1e2ceab745579002c4d@o4509944771051520.ingest.us.sentry.io/4509944774524928", // copy from Sentry project settings
  sendDefaultPii: true,
  integrations: [
    browserTracingIntegration(),
    replayIntegration(), // optional: records user sessions
  ],
  tracesSampleRate: 1.0, 
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development",
   beforeBreadcrumb(breadcrumb, hint) {
    if (breadcrumb.category === 'console') {
      // keep only warn + error, or include log too
      if (["error", "warn", "log"].includes(breadcrumb.level)) {
        return breadcrumb;
      }
      return null; // filter out everything else
    }
    return breadcrumb;
  },
});

// ✅ Force a first test event (so Sentry dashboard updates immediately)
Sentry.captureMessage("🚀 First test event from local dev!", "info");

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
          <App />
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
