import { instrumentFrontend } from "./instrumentation/frontend";
import { trackClicks } from "./lib/track";

trackClicks();

// Telemetria nunca derruba a página; sem token (dev local) não liga.
if (process.env.NEXT_PUBLIC_RUM_TOKEN) {
  try {
    instrumentFrontend();
  } catch (error) {
    console.error("RUM não inicializou", error);
  }
}
