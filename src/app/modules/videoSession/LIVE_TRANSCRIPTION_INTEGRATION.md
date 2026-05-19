# Web Frontend Integration Guide: Live Transcription

This guide explains how to implement live transcription in the **Consultant Dashboard (Web)**. You need to handle two streams: your own local speech and the remote speech from the mobile client.

---

## 1. Local Transcription (Consultant's Voice)

Since you are on the web, you should use the browser's native **Web Speech API** to transcribe your own voice locally. This is free and fast.

### Implementation Logic

```javascript
// Initialize Speech Recognition
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

recognition.onresult = event => {
  const transcript = Array.from(event.results)
    .map(result => result[0])
    .map(result => result.transcript)
    .join('');

  // Update your UI Sidebar with local transcript
  console.log('My Speech:', transcript);
  // dispatchEvent or update React state here
};

// Start transcribing when the call starts
recognition.start();
```

---

## 2. Remote Transcription (Client's Voice)

The backend supports two ways to receive the mobile client's voice as text.

### Method A: Agora DataStream (Recommended)

This is the most efficient method. The backend issues a token that already has `DataStream` privileges enabled.

**How to implement:**
Listen for the `stream-message` event from the Agora Web SDK.

```javascript
// Inside your Agora client initialization
client.on('stream-message', (uid, data) => {
  // 1. Decode the binary data
  const decodedData = new TextDecoder().decode(data);

  // 2. Parse the JSON (Mobile sends: { speaker: "Name", text: "..." })
  const payload = JSON.parse(decodedData);

  // 3. Update the UI Sidebar
  console.log(`${payload.speaker} said: ${payload.text}`);

  // Custom Event for React components
  window.dispatchEvent(
    new CustomEvent('agora-realtime-transcription', {
      detail: payload,
    }),
  );
});
```

### Method B: WebSocket Relay (Fallback)

If the mobile app is using WebSockets to send speech, you need to listen to the socket connection.

**How to implement:**

```javascript
import { io } from 'socket.io-client';
const socket = io('YOUR_BACKEND_URL', { auth: { token: 'YOUR_JWT' } });

socket.on('receive-speech', data => {
  // data: { speaker: "John", text: "...", sessionId: "..." }
  console.log('Received via Socket:', data.text);

  // Update your React state / Sidebar
});
```

---

## 3. UI Requirements (Consultant Dashboard)

To provide a professional experience, the **Session Sidebar** should:

1.  **Distinguish Speakers**: Use different colors or alignments for "Me" (Local) and "Client" (Remote).
2.  **Auto-Scroll**: Ensure the transcript container scrolls to the bottom as new text arrives.
3.  **Real-time Feedback**: Show "Consultant is speaking..." or "Client is speaking..." based on the active recognition state.

---

## 4. Technical Summary for Web Developers

| Feature                   | Technology       | Backend Requirement           |
| :------------------------ | :--------------- | :---------------------------- |
| **Local Voice**           | Web Speech API   | None (Browser Native)         |
| **Remote Voice (P2P)**    | Agora DataStream | `RtcRole.PUBLISHER` (Done)    |
| **Remote Voice (Socket)** | Socket.io        | `receive-speech` event (Done) |

### Important Note on Permissions

The Web Speech API requires **HTTPS** and microphone permissions. Ensure your development environment is served over `https://` for transcription to work correctly.
