import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store, persistor } from "./Redux/store.js";
import { PersistGate } from "redux-persist/integration/react";
import { ThemeProvider } from "@material-tailwind/react/context/theme";
import { startActivityTracking } from "./utils/activityTracker";

/* NOTE: Google Tag Manager is NOT initialised here any more.
 *
 * `react-gtm-module` used to call `TagManager.initialize({ gtmId })` on top of
 * the inline GTM snippet in index.html, which loaded gtm.js twice (~150 KiB
 * each) and doubled the GTM main-thread work. GTM is now bootstrapped exactly
 * once by the deferred loader in index.html, and `window.dataLayer` is ready
 * before React mounts, so all `dataLayer.push` calls in the app still work.
 */

startActivityTracking();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </StrictMode>
);
