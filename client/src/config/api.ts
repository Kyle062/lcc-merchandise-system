// Single source of truth for backend service locations.
//
// By default each service is expected on the same machine that serves the
// client, on its standard port. Override with VITE_* environment variables
// when the services live elsewhere (for example on a LAN server).
const hostname = window.location.hostname || "localhost";

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE = withoutTrailingSlash(
  import.meta.env.VITE_API_URL || `http://${hostname}:5000`,
);

export const ANALYTICS_SERVICE_BASE = withoutTrailingSlash(
  import.meta.env.VITE_ANALYTICS_URL || `http://${hostname}:8001`,
);

export const QR_SERVICE_BASE = withoutTrailingSlash(
  import.meta.env.VITE_QR_URL || `http://${hostname}:8000`,
);
