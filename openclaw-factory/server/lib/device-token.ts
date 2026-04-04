import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { DEVICE_TOKEN_PATH } from "./config.js";

interface DeviceTokenData {
  token: string;
  issuedAt: string;
  rotatedAt: string;
}

export function loadDeviceToken(): string | null {
  try {
    if (!existsSync(DEVICE_TOKEN_PATH)) return null;
    const raw = readFileSync(DEVICE_TOKEN_PATH, "utf-8");
    const data: DeviceTokenData = JSON.parse(raw);
    return data.token || null;
  } catch {
    return null;
  }
}

export function saveDeviceToken(token: string): void {
  const now = new Date().toISOString();
  const existing = loadDeviceTokenData();
  const data: DeviceTokenData = {
    token,
    issuedAt: existing?.issuedAt || now,
    rotatedAt: now,
  };
  writeFileSync(DEVICE_TOKEN_PATH, JSON.stringify(data, null, 2), "utf-8");
  console.log(`[device-token] Saved device token to ${DEVICE_TOKEN_PATH}`);
}

export function clearDeviceToken(): void {
  try {
    if (existsSync(DEVICE_TOKEN_PATH)) {
      unlinkSync(DEVICE_TOKEN_PATH);
      console.log(`[device-token] Cleared device token`);
    }
  } catch {
    // ignore
  }
}

function loadDeviceTokenData(): DeviceTokenData | null {
  try {
    if (!existsSync(DEVICE_TOKEN_PATH)) return null;
    const raw = readFileSync(DEVICE_TOKEN_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
