# Agora Real-Time Speech-to-Text (STT) Integration Guide

This guide provides instructions for mobile and web developers to integrate live transcription subtitles into the application.

---

## 1. Backend API Endpoints

The backend handles the orchestration of the Agora STT agent.

### Start Transcription
Typically triggered automatically when a session becomes `ongoing`. If manual trigger is needed:
**Endpoint**: `POST /api/v1/transcription/:consultationId/start`
**Auth**: Required (User/Consultant)

### Stop Transcription
Triggered automatically when a session ends.
**Endpoint**: `POST /api/v1/transcription/:consultationId/stop`

### Get Transcript History
Retrieve all previous transcripts for a consultation.
**Endpoint**: `GET /api/v1/transcription/:consultationId/history`

### Relay a Live Caption Chunk (REQUIRED for live subtitles)
Agora does **not** push recognized text to the backend over HTTP. The STT bot
(UID `9001`) publishes each recognized chunk as an **RTC data-stream message**
inside the channel — only clients joined to that channel receive it. Your app
must subscribe to that data stream (Agora SDK `onStreamMessage` /
`RtcEngineEventHandler.onStreamMessage`, decoded per Agora's RTT message
format) and forward each decoded chunk here so the backend can persist
finalized transcripts and re-broadcast them (e.g. to a web dashboard that
isn't joined to the RTC channel).

**Endpoint**: `POST /api/v1/transcription/:consultationId/ingest`
**Auth**: Required (User/Consultant — must be a participant of the session)
**Body**:
```json
{
  "uid": 1001,
  "text": "Hello, how can I help you?",
  "isFinal": true,
  "timestamp": 1750000000000
}
```
- `uid` must be the speaker's UID as reported by the STT result (`1001` client, `2001` consultant) — any other value is rejected.
- Send both interim (`isFinal: false`) and final chunks for the smoothest live captions; only final chunks are written to transcript history (de-duplicated server-side, since both participants relay the same data-stream message).

---

## 2. WebSocket Signaling (Live Subtitles)

To show subtitles in real-time, the frontend must listen for the `transcript:new` event (re-broadcast by the backend after a participant relays a chunk via `/ingest`).

### Socket Event: `transcript:new`
**Payload Structure**:
```json
{
  "consultationId": "65f...",
  "speakerUid": 1001,
  "speakerRole": "user", // or "consultant"
  "text": "Hello, how can I help you?",
  "isFinal": true,
  "timestamp": "2026-05-20T12:30:00Z"
}
```

---

## 3. Speaker Identification (UID Mapping)

To correctly identify who is speaking, use the following fixed UID mapping:

| Role | Agora UID |
| :--- | :--- |
| **Client / User** | `1001` |
| **Consultant** | `2001` |
| **STT Agent (Bot)** | `9001` |

---

## 4. Frontend Tasks

### Flutter (Client App)
1. Join the Agora RTC channel using the token from `/api/v1/video-session/join`.
2. Connect to the WebSocket server.
3. Listen for the `transcript:new` event.
4. If `speakerUid === 1001`, show text as "Me".
5. If `speakerUid === 2001`, show text as "Consultant".
6. Render the `text` as an overlay subtitle.

### Web Dashboard (Consultant)
1. Join the Agora RTC channel using the web SDK.
2. Listen for the `transcript:new` socket event.
3. Display transcripts in the right-side "Transcript History" panel.
4. Distinguish between your own messages (`2001`) and the client's (`1001`).

---

## 5. Security & Billing
- **STT Agent**: The backend spawns an Agora STT agent (UID 9001) that listens to the audio.
- **Auto-Stop**: The backend automatically stops the STT agent when the call ends to prevent extra billing.
- **Environment**: Ensure `AGORA_CUSTOMER_ID` and `AGORA_CUSTOMER_SECRET` are correctly set in the backend `.env`.
