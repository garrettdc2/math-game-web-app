# OpenClaw HTTP API Deep Dive Report

**Date:** 2026-04-03
**Gateway:** http://localhost:18789
**Test Status:** ✅ All endpoints operational

## Executive Summary

The OpenClaw gateway provides a **chat completions API** compatible with OpenAI's format, plus a **hooks API** for asynchronous agent triggering. Session persistence works correctly via `sessionKey` parameter, enabling multi-turn conversations with context retention. The gateway runs as a Docker service (`ghcr.io/openclaw/openclaw:latest`) with full support for streaming responses and SSE.

---

## 1. Chat Completions API: `/v1/chat/completions`

### Endpoint
```
POST /v1/chat/completions
```

### Authentication
```
Authorization: Bearer factory-local-dev
Content-Type: application/json
```

### Request Schema
```json
{
  "model": "openclaw",                    // Required: "openclaw" or "openclaw/factory"
  "stream": false,                        // Optional: true for Server-Sent Events
  "messages": [                           // Required: array with user/assistant roles
    {"role": "user", "content": "..."}
  ],

  // Optional metadata fields:
  "sessionKey": "string",                 // Enables session persistence
  "agentId": "string",                    // Agent identifier
  "conversationId": "string"              // Conversation context identifier
}
```

### Response (Non-Streaming)
```json
{
  "id": "chatcmpl_<uuid>",
  "object": "chat.completion",
  "created": 1775251769,
  "model": "openclaw",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Response text here"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

### Response (Streaming)
Server-Sent Events format:
```
data: {"id":"...", "object":"chat.completion.chunk", "choices":[{"index":0,"delta":{"role":"assistant"}}]}
data: {"id":"...", "object":"chat.completion.chunk", "choices":[{"index":0,"delta":{"content":"Hello"}}]}
data: [DONE]
```

### Key Features

#### ✅ Session Persistence (Critical for Pipeline Continuity)
The gateway maintains agent memory across requests using `sessionKey`:

**Test Results:**
```bash
# Message 1: Store information
curl -X POST /v1/chat/completions \
  -d '{"model":"openclaw", "messages":[{"role":"user","content":"My favorite color is blue"}], "sessionKey":"test-session"}'
# Response: "I'll save that to your memory file... Stored."

# Message 2: Recall information (same sessionKey)
curl -X POST /v1/chat/completions \
  -d '{"model":"openclaw", "messages":[{"role":"user","content":"What's my favorite color?"}], "sessionKey":"test-session"}'
# Response: "Your favorite color is **blue** — it's noted in your memory file."
```

**Mechanism:** Each `sessionKey` creates a persistent memory file (MEMORY.md) that the agent reads/writes. This is essential for pipeline approval gates: after a human approval, sending the next message with the same sessionKey allows the agent to resume work with full context.

#### ✅ Streaming Support
Set `"stream": true` for Server-Sent Events response. Useful for:
- Real-time response display
- Early termination of long responses
- Progress indication

#### ✅ Multi-Turn Conversations
Include full conversation history in `messages` array:
```json
{
  "messages": [
    {"role": "user", "content": "first question"},
    {"role": "assistant", "content": "first answer"},
    {"role": "user", "content": "follow-up"}
  ]
}
```

#### ❌ Model Support
Only `openclaw` and `openclaw/factory` are recognized:
- `"model": "openclaw"` ✅ Works (default agent)
- `"model": "openclaw/factory"` ✅ Works (factory-specific agent)
- `"model": "gpt-4"` ❌ Returns: `Invalid model. Use openclaw or openclaw/factory`
- `"model": "claude-3-opus"` ❌ Same error

#### 📊 Token Usage
The `usage` field reports `0` for all token counts (not yet implemented or calculated).

### Error Handling

| Condition | Response |
|-----------|----------|
| Missing Authorization | `{"message": "Unauthorized", "type": "unauthorized"}` (401) |
| Invalid token | `{"message": "Unauthorized", "type": "unauthorized"}` (401) |
| Empty messages | `{"error": {"message": "Missing user message in messages.", "type": "invalid_request_error"}}` |
| Invalid model | Returns null for `.choices[0].message.content` |

---

## 2. Hooks API: Asynchronous Agent Invocation

### 2a. Agent Hook: `/hooks/agent`

#### Endpoint
```
POST /hooks/agent
Authorization: Bearer factory-webhook-secret
Content-Type: application/json
```

#### Request Schema
```json
{
  "message": "string",        // REQUIRED: Agent task/prompt
  "agentId": "string",        // REQUIRED: Which agent to run
  "deliver": boolean,         // Optional: Deliver response (default: false)
  "channel": "string",        // Optional: Delivery channel (must be last field)
  "to": "string",             // Optional: Recipient
  "name": "string",           // Optional: Agent name
  "model": "string",          // Optional: Model override
  "thinking": boolean,        // Optional: Enable extended thinking
  "timeoutSeconds": integer   // Optional: Max execution time

  // DISABLED:
  // "sessionKey": "..."       // Not allowed (causes error)
}
```

#### Response
```json
{
  "ok": true,
  "runId": "uuid"
}
```

### 2b. Wake Hook: `/hooks/wake`

Immediately wake up a sleeping agent.

#### Endpoint
```
POST /hooks/wake
Authorization: Bearer factory-webhook-secret
Content-Type: application/json
```

#### Request Schema
```json
{
  "agentId": "string",        // REQUIRED: Which agent to wake
  "text": "string",           // REQUIRED: Wake message/context
  "mode": "now" | "next"      // Optional: Execution mode
}
```

#### Response
```json
{
  "ok": true,
  "mode": "now"
}
```

### Hooks Error Handling

| Error | Cause |
|-------|-------|
| `{"error": "message required"}` | Missing `message` field in /hooks/agent |
| `{"error": "text required"}` | Missing `text` field in /hooks/wake |
| `{"error": "channel must be last"}` | `channel` field not at end of object |
| `{"error": "sessionKey is disabled..."}` | `sessionKey` not allowed in /hooks/agent; use chat completions API instead |

---

## 3. Health Check Endpoint

### Endpoint
```
GET /health
```

### Response
```json
{
  "ok": true,
  "status": "live"
}
```

---

## 4. Configuration & Deployment

### Gateway Config (`openclaw-config.json`)
```json
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "factory-local-dev"
    },
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    }
  },
  "hooks": {
    "enabled": true,
    "token": "factory-webhook-secret",
    "path": "/hooks"
  },
  "agents": {
    "list": [
      { "id": "factory", "workspace": "/root/agents/factory" },
      { "id": "pm", "workspace": "/root/agents/pm" },
      { "id": "architect", "workspace": "/root/agents/architect" },
      { "id": "dev", "workspace": "/root/agents/dev" },
      { "id": "reviewer", "workspace": "/root/agents/reviewer" },
      { "id": "tester", "workspace": "/root/agents/tester" },
      { "id": "deployer", "workspace": "/root/agents/deployer" }
    ]
  }
}
```

### Docker Service
```yaml
openclaw:
  image: ghcr.io/openclaw/openclaw:latest
  ports:
    - "18789:18789"
  volumes:
    - ./agents:/root/agents          # Agent code
    - ./hooks:/root/.openclaw/hooks  # Hook scripts
    - ./memory:/root/memory          # Persistent memory
```

---

## 5. Session Continuity Architecture (CRITICAL)

### How Sessions Work

1. **Session Creation:** Client sends request with `sessionKey` parameter
2. **Memory File:** Gateway creates/reads `memory/{sessionKey}/USER.md` on agent's filesystem
3. **Context Retention:** Agent can read own memory file, maintaining conversation history
4. **Pipeline Resumption:** After approval gate, send same `sessionKey` to resume with full context

### For Pipeline Gates

```
1. Start pipeline with sessionKey: "hook:factory:TASK-123"
   → Agent works on stage, hits a gate, writes [GATE:...] marker

2. Dashboard polls for pending gates, presents approval UI

3. Human approves gate
   → Dashboard calls POST /api/pipeline/approve/TASK-123/gate_name
   → Dashboard sends message with same sessionKey
   → Agent wakes up with full context from MEMORY.md
   → Agent continues pipeline from gate
```

### Test: Session Persistence Across Requests
```bash
# Request 1: Store data
curl http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer factory-local-dev" \
  -d '{"model":"openclaw", "stream":false, "messages":[{"role":"user","content":"Store: My secret is 12345"}], "sessionKey":"continuity-test"}'
# → "I'll save that to your memory file..."

# Request 2: Recall data (same sessionKey)
curl http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer factory-local-dev" \
  -d '{"model":"openclaw", "stream":false, "messages":[{"role":"user","content":"What did I tell you about my secret?"}], "sessionKey":"continuity-test"}'
# → "Your secret is **12345**. *Source: MEMORY.md*"
```

✅ **Result:** Session persistence confirmed working. Context carries over correctly.

---

## 6. API Surface Summary

### Endpoints
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/v1/chat/completions` | Send message to agent | Bearer `factory-local-dev` |
| POST | `/hooks/agent` | Async agent trigger | Bearer `factory-webhook-secret` |
| POST | `/hooks/wake` | Wake sleeping agent | Bearer `factory-webhook-secret` |
| GET | `/health` | Health check | None |

### URL Format
```
http://localhost:18789/v1/chat/completions
http://localhost:18789/hooks/agent
http://localhost:18789/hooks/wake
http://localhost:18789/health
```

### No Session/Conversation List Endpoints Found
- ❌ `/v1/sessions` → Returns HTML (SPA fallback)
- ❌ `/api/sessions` → 404 Not Found
- ❌ `/sessions` → Returns HTML (SPA fallback)
- ❌ `/conversations` → Returns HTML (SPA fallback)
- ❌ `/metrics` → Returns HTML (SPA fallback)

*Note: These routes are handled by the dashboard (port 8000), not the OpenClaw gateway (port 18789).*

---

## 7. Unsupported Features

### WebSocket Endpoints
No WebSocket support found. Gateway uses HTTP polling + SSE for streaming.

### Session Lookup
No endpoint to list active sessions. Sessions are identified solely by `sessionKey` string.

### Model Management
Cannot dynamically add/configure models. Only `openclaw` and `openclaw/factory` work.

### Token Counting
Token usage always returns 0. No actual token accounting implemented.

---

## 8. Critical Use Cases for Pipeline

### ✅ Supported
1. **Multi-stage pipelines with gates** — Use `sessionKey` for context continuity
2. **Streaming responses** — Monitor real-time agent output
3. **Async agent triggers** — Use `/hooks/agent` for background work
4. **Context preservation** — Memory files persist across requests

### ⚠️ Requires Special Handling
1. **Approval after gates** — Must use same `sessionKey` to resume
2. **Agent timeouts** — Use `timeoutSeconds` in hooks payload
3. **Parallel subtasks** — Use unique `sessionKey` per subtask

---

## 9. Testing Commands (Copy-Paste Ready)

```bash
# Basic test
curl -s http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer factory-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw","stream":false,"messages":[{"role":"user","content":"ping"}]}'

# Test session persistence
SESS=$(date +%s)
curl -s http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer factory-local-dev" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"openclaw\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"Remember: my secret is ABC\"}],\"sessionKey\":\"$SESS\"}"

curl -s http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer factory-local-dev" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"openclaw\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"What's my secret?\"}],\"sessionKey\":\"$SESS\"}"

# Test streaming
curl -s -N http://localhost:18789/v1/chat/completions \
  -H "Authorization: Bearer factory-local-dev" \
  -H "Content-Type: application/json" \
  -d '{"model":"openclaw/factory","stream":true,"messages":[{"role":"user","content":"count to 3"}]}'

# Test hooks
curl -s -X POST http://localhost:18789/hooks/agent \
  -H "Authorization: Bearer factory-webhook-secret" \
  -H "Content-Type: application/json" \
  -d '{"message":"Start processing task X","agentId":"factory"}'

# Health check
curl -s http://localhost:18789/health
```

---

## Last Updated
2026-04-03 — Full API surface tested and documented
