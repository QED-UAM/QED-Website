import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

// Outgoing HTTP from the server (Google's token endpoint during login, Resend) uses Node's
// built-in fetch, which ignores HTTP_PROXY/HTTPS_PROXY unless the process was started with
// NODE_USE_ENV_PROXY=1. Behind a VPN that only exposes a local proxy (e.g. developing from
// China), those calls would time out. When a proxy is configured, route fetch through it,
// honoring NO_PROXY. Without proxy variables (production) nothing changes.
const proxy =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

if (proxy && process.env.NODE_USE_ENV_PROXY !== "1") {
    setGlobalDispatcher(new EnvHttpProxyAgent());
    console.info(`[network] outgoing requests use the proxy from the environment (${proxy})`);
}
