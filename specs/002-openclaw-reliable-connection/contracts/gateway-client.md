# Contract: OpenClaw Gateway WebSocket Client

**Date**: 2026-04-03  
**Feature**: 002-openclaw-reliable-connection

## Overview

New server-side module that maintains a persistent WebSocket connection to the OpenClaw Gateway. This is the primary event source for the dashboard, replacing the hook-based fire-and-forget pattern.

## Connection Lifecycle

### Initial Connection

```
1. Open WebSocket to ws://openclaw:18789 (OPENCLAW_BASE_URL)
2. Receive: {type:"event", event:"connect.challenge", payload:{nonce, ts}}
3. Send connect request:
   {
     type: "req",
     id: "<uuid>",
     method: "connect",
     params: {
       minProtocol: 3,
       maxProtocol: 3,
       client: { name: "factory-dashboard", version: "1.0.0", platform: "node" },
       role: "operator",
       scopes: ["operator.read", "operator.approvals"],
       auth: { token: OPENCLAW_API_TOKEN }  // or authDeviceToken on reconnect
       device: { id, publicKey, signature, signedAt, nonce }
     }
   }
4. Receive: {type:"res", id:"<uuid>", ok:true, payload:{connId, auth:{deviceToken}, features:{...}}}
5. Persist device token to file
6. Set status → Connected
```

### Reconnection (with Device Token)

```
1. Open WebSocket to ws://openclaw:18789
2. Receive: connect.challenge
3. Send connect request with auth: { authDeviceToken: <stored_token> }
4. On success: resume, reset retry count
5. On auth error (canRetryWithDeviceToken: false):
   - Fallback to auth: { token: OPENCLAW_API_TOKEN }
   - If that succeeds: persist new device token
   - If that fails: increment retry, apply backoff
```

### Backoff Schedule

| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1       | 1s    | 1s         |
| 2       | 2s    | 3s         |
| 3       | 4s    | 7s         |
| 4       | 8s    | 15s        |
| 5       | 16s   | 31s        |
| 6       | 30s   | 61s        |
| 7       | 30s   | 91s        |
| 8       | 30s   | 121s       |
| 9       | 30s   | 151s       |
| 10      | 30s   | 181s       |

After attempt 10: transition to Disconnected. Await manual retry or server restart.

## Event Processing

### Incoming Events

For every `{type:"event"}` frame received:

1. **Track `seq`**: Compare `frame.seq` against `lastGatewaySeq + 1`
   - If gap detected (seq > expected): trigger gap recovery
   - Update `lastGatewaySeq = frame.seq`

2. **Route by event type**:
   - `tick`: Update `lastTickAt` timestamp (keepalive signal)
   - `health`: Log Gateway health status
   - `exec.approval.requested`: Map to `gate:waiting` pipeline event
   - All others: Pass to event processor for marker extraction and persistence

3. **Persist**: Insert into events table (with `gateway_seq`, `source: "websocket"`)
4. **Publish**: Broadcast to SSE EventBus

### Gap Recovery

```
Small gap (<=3 missing):
  1. Log warning with expected vs received seq
  2. Call chat.history RPC for active sessions
  3. Reset lastGatewaySeq to received value
  4. Check local event store for hook-delivered events filling the gap

Large gap (>3 missing):
  1. Log error
  2. Close WebSocket and reconnect
  3. On reconnect, fetch full state via sessions.list + chat.history
```

## RPC Methods Used

| Method | When | Purpose |
|--------|------|---------|
| `chat.send` | Pipeline start, approvals | Send messages to agent sessions (replaces POST to /hooks/agent) |
| `chat.history` | Gap recovery, state reconstruction | Fetch conversation history for a session |
| `chat.abort` | Pipeline abort | Abort running agent |
| `sessions.list` | Reconnection, state recovery | Discover available sessions |
| `exec.approval.resolve` | Gate approval | Resolve approval gates |
| `device.token.rotate` | Every 24h while connected | Refresh device token |

## Keepalive

- **Client ping**: Send WebSocket ping frame every 30 seconds
- **Server tick monitoring**: Expect `tick` event every 30 seconds
- **Dead connection threshold**: If no `tick` for 90 seconds (3 missed), close and reconnect
