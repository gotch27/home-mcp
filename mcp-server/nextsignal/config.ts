import { createConfig, envConfigProvider, jsonConfigProvider } from "@gotch/nextsignal";

// Configuration is intentionally app-owned. This starter loads a committed JSON
// default first, then overlays environment values prefixed with NEXTSIGNAL_.
//
// Example:
// NEXTSIGNAL_LOGGING__LEVEL=debug maps to config path `logging.level`.
export const config = createConfig({
  providers: [
    jsonConfigProvider("config/default.json"),
    envConfigProvider({ prefix: "NEXTSIGNAL_" })
  ]
});
