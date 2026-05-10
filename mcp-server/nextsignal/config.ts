import { createConfig, envConfigProvider, jsonConfigProvider } from "@gotch/nextsignal";

// Configuration is intentionally app-owned. This starter loads a committed JSON
// default first, then overlays environment values prefixed with CONFIG_ENV_PREFIX.
//
// Example:
// NEXTSIGNAL_LOGGING__LEVEL=debug maps to config path `logging.level`.
export const CONFIG_ENV_PREFIX = "NEXTSIGNAL_";

export const config = createConfig({
  providers: [
    jsonConfigProvider("config/default.json"),
    envConfigProvider({ prefix: CONFIG_ENV_PREFIX })
  ]
});
