import WebSocket from "ws";
import { randomUUID, generateKeyPairSync, sign, createHash, type KeyObject } from "crypto";
import { loadDeviceToken, saveDeviceToken, clearDeviceToken } from "./device-token.js";
import { OPENCLAW_BASE_URL, OPENCLAW_API_TOKEN } from "./config.js";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";
type EventCallback = (event: string, payload: Record<string, unknown>, seq?: number) => void;
type StatusCallback = (status: ConnectionStatus) => void;

interface PendingRequest {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface GatewayClientOptions {
  onEvent: EventCallback;
  onStatusChange?: StatusCallback;
}

const BACKOFF_SCHEDULE = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000];
const KEEPALIVE_INTERVAL = 30_000;
const TICK_DEAD_THRESHOLD = 90_000;
const HANDSHAKE_TIMEOUT = 10_000;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private _status: ConnectionStatus = "disconnected";
  private _connId: string = "";
  private _lastGatewaySeq: number = 0;
  private _lastTickAt: Date | null = null;
  private _retryCount: number = 0;
  private _upSince: Date | null = null;

  private privateKey: KeyObject;
  private publicKey: KeyObject;
  private publicKeyBase64: string;
  private deviceId: string;

  private pendingRequests = new Map<string, PendingRequest>();
  private onEvent: EventCallback;
  private onStatusChange?: StatusCallback;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private tickCheckTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private handshakeResolve: ((ok: boolean) => void) | null = null;
  private destroyed = false;

  constructor(options: GatewayClientOptions) {
    this.onEvent = options.onEvent;
    this.onStatusChange = options.onStatusChange;

    // Generate ed25519 keypair
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    const rawPubKey = publicKey.export({ type: "spki", format: "der" });
    this.publicKeyBase64 = rawPubKey.toString("base64");
    this.deviceId = createHash("sha256").update(rawPubKey).digest("hex");
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  getStatus() {
    return {
      status: this._status,
      connId: this._connId,
      lastGatewaySeq: this._lastGatewaySeq,
      lastTickAt: this._lastTickAt?.toISOString() ?? null,
      retryCount: this._retryCount,
      upSince: this._upSince?.toISOString() ?? null,
    };
  }

  async start(): Promise<void> {
    if (this.destroyed) return;
    this.setStatus("reconnecting");
    await this.connect();
  }

  private setStatus(status: ConnectionStatus): void {
    if (this._status === status) return;
    this._status = status;
    console.log(`[gateway-client] [${new Date().toISOString()}] Status change: ${this._status} → ${status}`);
    this.onStatusChange?.(status);
  }

  private getWsUrl(): string {
    return OPENCLAW_BASE_URL
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:");
  }

  private async connect(): Promise<void> {
    if (this.destroyed) return;

    return new Promise<void>((resolve) => {
      const wsUrl = this.getWsUrl();
      console.log(`[gateway-client] Connecting to ${wsUrl} (attempt ${this._retryCount + 1})`);

      try {
        this.ws = new WebSocket(wsUrl, {
          headers: { Origin: "http://localhost:18789" },
        });
      } catch (err) {
        console.error(`[gateway-client] WebSocket constructor error:`, err);
        this.scheduleReconnect();
        resolve();
        return;
      }

      let handshakeComplete = false;

      this.ws.on("open", () => {
        console.log(`[gateway-client] WebSocket open, waiting for challenge...`);
      });

      this.ws.on("message", (raw: WebSocket.RawData) => {
        try {
          const frame = JSON.parse(raw.toString());
          if (!handshakeComplete) {
            this.handleHandshake(frame).then((ok) => {
              if (ok) {
                handshakeComplete = true;
                this._retryCount = 0;
                this._upSince = new Date();
                this._lastTickAt = new Date();
                this.setStatus("connected");
                this.startKeepalive();
                resolve();
              }
            }).catch((err) => {
              console.error(`[gateway-client] Handshake error:`, err);
              this.cleanup();
              this.scheduleReconnect();
              resolve();
            });
          } else {
            this.handleFrame(frame);
          }
        } catch (err) {
          console.error(`[gateway-client] Message parse error:`, err);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(`[gateway-client] WebSocket closed: ${code} ${reason?.toString()}`);
        this.cleanup();
        if (!this.destroyed) {
          this.scheduleReconnect();
        }
        if (!handshakeComplete) resolve();
      });

      this.ws.on("error", (err) => {
        console.error(`[gateway-client] WebSocket error:`, err.message);
        // close event will follow
      });

      // Handshake timeout
      this.handshakeTimer = setTimeout(() => {
        if (!handshakeComplete) {
          console.error(`[gateway-client] Handshake timeout`);
          this.ws?.close();
        }
      }, HANDSHAKE_TIMEOUT);
    });
  }

  private async handleHandshake(frame: Record<string, unknown>): Promise<boolean> {
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }

    // Expect connect.challenge
    if (frame.type === "event" && frame.event === "connect.challenge") {
      const payload = frame.payload as { nonce: string; ts: number };
      return this.sendConnectRequest(payload.nonce);
    }

    // Response to our connect request
    if (frame.type === "res") {
      if (frame.ok) {
        const payload = frame.payload as Record<string, unknown>;
        this._connId = (payload.connId as string) || "";
        const auth = payload.auth as Record<string, unknown> | undefined;
        if (auth?.deviceToken) {
          saveDeviceToken(auth.deviceToken as string);
        }
        const grantedScopes = auth?.scopes || (payload as Record<string, unknown>).scopes;
        console.log(`[gateway-client] Connected: connId=${this._connId}, scopes=${JSON.stringify(grantedScopes)}`);
        return true;
      } else {
        const error = frame.error as Record<string, unknown> | undefined;
        const details = error?.details as Record<string, unknown> | undefined;
        console.error(`[gateway-client] Connect rejected:`, error?.message);

        if (details?.canRetryWithDeviceToken === false) {
          console.log(`[gateway-client] Device token invalid, clearing and retrying with API token`);
          clearDeviceToken();
          // Will retry on next connect attempt with API token
        }
        return false;
      }
    }

    return false;
  }

  private sendConnectRequest(nonce: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;

    // Use control-ui client ID — dangerouslyDisableDeviceAuth only applies to this client
    const clientId = "openclaw-control-ui";
    const clientMode = "ui";
    const role = "operator";
    const scopes = ["operator.read", "operator.write", "operator.approvals"];
    const signedAtMs = Date.now();

    const deviceToken = loadDeviceToken();
    const auth: Record<string, string> = deviceToken
      ? { authDeviceToken: deviceToken }
      : { token: OPENCLAW_API_TOKEN };

    // Connect without device identity — relies on dangerouslyDisableDeviceAuth
    // for the control-ui client. The Gateway grants scopes based on the token auth.
    const connectReq = {
      type: "req",
      id: randomUUID(),
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: { id: clientId, version: "1.0.0", platform: "node", mode: clientMode },
        role,
        scopes,
        caps: [],
        userAgent: "factory-dashboard/1.0.0",
        locale: "en-US",
        auth,
      },
    };

    this.ws.send(JSON.stringify(connectReq));
    return true; // Will get response in next message
  }

  private handleFrame(frame: Record<string, unknown>): void {
    if (frame.type === "event") {
      const event = frame.event as string;
      const payload = (frame.payload as Record<string, unknown>) || {};
      const seq = frame.seq as number | undefined;

      // Track seq from ALL events (including tick/health) since seq is global
      if (seq !== undefined) {
        if (this._lastGatewaySeq > 0 && seq > this._lastGatewaySeq + 1) {
          const gap = seq - this._lastGatewaySeq - 1;
          if (gap <= 3) {
            console.warn(`[gateway-client] [${new Date().toISOString()}] Seq gap: expected=${this._lastGatewaySeq + 1} received=${seq} missing=${gap}`);
          } else {
            console.error(`[gateway-client] [${new Date().toISOString()}] Large seq gap: expected=${this._lastGatewaySeq + 1} received=${seq} missing=${gap} action=reconnect`);
            this._lastGatewaySeq = seq;
            this.ws?.close();
            return;
          }
        }
        this._lastGatewaySeq = seq;
      }

      if (event === "tick") {
        this._lastTickAt = new Date();
        return;
      }

      if (event === "health") {
        return;
      }

      this.onEvent(event, payload, seq);
    } else if (frame.type === "res") {
      const id = frame.id as string;
      const pending = this.pendingRequests.get(id);
      if (pending) {
        this.pendingRequests.delete(id);
        clearTimeout(pending.timer);
        if (frame.ok) {
          pending.resolve(frame.payload);
        } else {
          pending.reject(new Error(`RPC error: ${JSON.stringify(frame.error)}`));
        }
      }
    }
  }

  async rpc(method: string, params: Record<string, unknown> = {}, timeout = 30_000): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Gateway not connected (status: ${this._status})`);
    }

    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`RPC timeout: ${method} (${timeout}ms)`));
      }, timeout);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.ws!.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  private startTokenRotation(): void {
    this.stopTokenRotation();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    this.rotationTimer = setInterval(async () => {
      try {
        const result = await this.rpc("device.token.rotate", {}) as { deviceToken?: string };
        if (result?.deviceToken) {
          saveDeviceToken(result.deviceToken);
          console.log(`[gateway-client] [${new Date().toISOString()}] Device token rotated`);
        }
      } catch (err) {
        console.warn("[gateway-client] Device token rotation failed:", err);
      }
    }, TWENTY_FOUR_HOURS);
  }

  private stopTokenRotation(): void {
    if (this.rotationTimer) { clearInterval(this.rotationTimer); this.rotationTimer = null; }
  }

  private startKeepalive(): void {
    this.stopKeepalive();

    // Send WebSocket ping every 30s
    this.keepAliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, KEEPALIVE_INTERVAL);

    // Start device token rotation
    this.startTokenRotation();

    // Check for tick timeout every 30s
    this.tickCheckTimer = setInterval(() => {
      if (this._lastTickAt) {
        const elapsed = Date.now() - this._lastTickAt.getTime();
        if (elapsed > TICK_DEAD_THRESHOLD) {
          console.warn(`[gateway-client] [${new Date().toISOString()}] Tick timeout: elapsed=${Math.round(elapsed / 1000)}s threshold=${TICK_DEAD_THRESHOLD / 1000}s action=reconnect`);
          this.ws?.close();
        }
      }
    }, KEEPALIVE_INTERVAL);
  }

  private stopKeepalive(): void {
    if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); this.keepAliveTimer = null; }
    if (this.tickCheckTimer) { clearInterval(this.tickCheckTimer); this.tickCheckTimer = null; }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return;
    if (this._retryCount >= BACKOFF_SCHEDULE.length) {
      console.error(`[gateway-client] Max retries (${BACKOFF_SCHEDULE.length}) exhausted`);
      this.setStatus("disconnected");
      return;
    }

    const delay = BACKOFF_SCHEDULE[this._retryCount];
    this._retryCount++;
    this.setStatus("reconnecting");
    console.log(`[gateway-client] [${new Date().toISOString()}] Scheduling reconnect: delay=${delay}ms attempt=${this._retryCount}/${BACKOFF_SCHEDULE.length}`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((err) => {
        console.error(`[gateway-client] Reconnect error:`, err);
      });
    }, delay);
  }

  private cleanup(): void {
    this.stopKeepalive();
    this.stopTokenRotation();
    if (this.handshakeTimer) { clearTimeout(this.handshakeTimer); this.handshakeTimer = null; }

    // Reject all pending RPCs
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.cleanup();
    this.setStatus("disconnected");
  }
}
