import mongoose from "mongoose";
import { config } from "../config";

// One shared, self-healing connection for the whole process (pages, actions and the
// session store all use it).
//
// Why the old app lost the database after Watchtower updates: `mongoose.connect()` was
// called once and never awaited. If MongoDB wasn't reachable at that moment (container
// restarting), the promise rejected and mongoose never retries an initial connection, so
// every query hung until timeout. connect-mongo also opened its own second client.
//
// Here: the initial connection is retried with backoff, the driver's automatic reconnection
// handles later outages, and a watchdog exits the process if the database stays unreachable
// for too long, so Docker's restart policy starts a fresh process (new DNS lookup, new pools).

const log = (message: string) => console.log(`[db] ${new Date().toISOString()} ${message}`);

let connecting: Promise<typeof mongoose> | undefined;
let disconnectedSince: number | undefined = Date.now();
let watchdog: NodeJS.Timeout | undefined;

function startWatchdog() {
    if (watchdog || config.dbWatchdogSeconds <= 0) return;
    watchdog = setInterval(() => {
        if (disconnectedSince === undefined) return;
        const seconds = (Date.now() - disconnectedSince) / 1000;
        if (seconds > config.dbWatchdogSeconds) {
            log(`no connection for ${Math.round(seconds)}s, exiting so the container restarts`);
            process.exit(1);
        }
    }, 5000);
    watchdog.unref();
}

function attachListeners() {
    const connection = mongoose.connection;
    connection.on("connected", () => {
        disconnectedSince = undefined;
        log("connected");
    });
    connection.on("reconnected", () => {
        disconnectedSince = undefined;
        log("reconnected");
    });
    connection.on("disconnected", () => {
        disconnectedSince ??= Date.now();
        log("disconnected");
    });
    connection.on("error", (error: Error) => log(`error: ${error.message}`));
}

async function connectWithRetry(): Promise<typeof mongoose> {
    attachListeners();
    startWatchdog();
    let attempt = 0;
    for (;;) {
        attempt++;
        try {
            await mongoose.connect(config.mongodbUri, {
                serverSelectionTimeoutMS: 5000,
                heartbeatFrequencyMS: 5000
            });
            return mongoose;
        } catch (error) {
            const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 30000);
            log(`connection attempt ${attempt} failed (${(error as Error).message}), retrying in ${delay / 1000}s`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

/** Resolves once the database is connected. Safe to call on every request. */
export function connectDB(): Promise<typeof mongoose> {
    connecting ??= connectWithRetry();
    return connecting;
}

export function isDatabaseConnected(): boolean {
    return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
