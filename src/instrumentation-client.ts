import { clientConfig } from "./lib/clientConfig";
import { instrumentFrontend } from "./instrumentation/frontend";
import { initKeyboardScroll } from "./lib/keyboardScroll";
import { trackClicks } from "./lib/track";

trackClicks();
initKeyboardScroll();

// Telemetria nunca derruba a página; sem config de RUM (dev local) não liga.
if (clientConfig().rum) {
  instrumentFrontend().catch((error) => console.error("RUM não inicializou", error));
}
