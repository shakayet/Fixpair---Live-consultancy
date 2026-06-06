# FixPair Video Session Integration Guideline (Flutter Mobile)

This document provides a comprehensive guide for the Flutter Mobile team to integrate and manage real-time video sessions using the `agora_rtc_engine` and the FixPair Backend API.

---

## 1. Overview
### Purpose
The Mobile client is primarily used by **Users** to receive advice and **Consultants** on-the-go. The integration handles incoming call notifications via FCM, Agora RTC media streaming, and real-time billing updates.

### Connectivity
- **Push Notifications**: Call alerts are delivered via Firebase Cloud Messaging (FCM) when the app is in the background or terminated.
- **Signaling**: Real-time status updates (user joined, call ended) are handled via Socket.io.
- **Billing**: Automatically managed by the backend once the `/join` API is called.

---

## 2. Integration Setup

### Dependencies
Add the following to your `pubspec.yaml`:
```yaml
dependencies:
  agora_rtc_engine: ^6.3.0 # or latest
  permission_handler: ^11.0.0
  socket_io_client: ^3.0.0
  firebase_messaging: ^14.7.0
```

### Permissions
Ensure you request `Camera` and `Microphone` permissions before attempting to join a session.

---

## 3. Video Session Flow (Mobile)

1. **Incoming Call (FCM)**: Mobile receives a push notification with `type: "INCOMING_CALL"`.
2. **Accept Call**: User clicks "Accept", calling the `/api/v1/video-session/join` endpoint.
3. **Initialize Agora**: Use the `appId`, `token`, and `channelName` from the API response.
4. **Live Stream**: Render local and remote video views.
5. **Billing**: Backend starts charging the user per minute.
6. **End Call**: User hangs up, calling `/api/v1/video-session/end`.

---

## 4. Required APIs (Mobile)

| Action | Endpoint | Method | Payload |
| :--- | :--- | :--- | :--- |
| **Join Session** | `/api/v1/video-session/join` | `POST` | `{ "sessionId": "..." }` |
| **End Session** | `/api/v1/video-session/end` | `POST` | `{ "sessionId": "..." }` |
| **Reject Call** | `/api/v1/video-session/action` | `POST` | `{ "sessionId": "...", "action": "REJECT" }` |

---

## 5. Agora RTC Implementation (Dart)

### Engine Initialization
```dart
import 'package:agora_rtc_engine/agora_rtc_engine.dart';

late RtcEngine _engine;

Future<void> initAgora(String appId, String channelName, String token, int uid) async {
  // 1. Create Engine
  _engine = createAgoraRtcEngine();
  await _engine.initialize(RtcEngineContext(appId: appId));

  // 2. Event Handlers
  _engine.registerEventHandler(RtcEngineEventHandler(
    onJoinChannelSuccess: (RtcConnection connection, int elapsed) {
      print("Local user joined: ${connection.localUid}");
    },
    onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
      setState(() { _remoteUid = remoteUid; });
    },
    onUserOffline: (RtcConnection connection, int remoteUid, UserOfflineReasonType reason) {
      setState(() { _remoteUid = null; });
    },
  ));

  // 3. Enable Video
  await _engine.enableVideo();
  await _engine.startPreview();

  // 4. Join Channel
  await _engine.joinChannel(
    token: token,
    channelId: channelName,
    uid: uid, // User: 1001, Consultant: 2001
    options: const ChannelMediaOptions(),
  );
}
```

### Rendering Video
```dart
// Local Video
AgoraVideoView(
  controller: VideoViewController(
    rtcEngine: _engine,
    canvas: const VideoCanvas(uid: 0), // 0 means local
  ),
)

// Remote Video
if (_remoteUid != null)
  AgoraVideoView(
    controller: VideoViewController.remote(
      rtcEngine: _engine,
      canvas: VideoCanvas(uid: _remoteUid),
      connection: RtcConnection(channelId: channelName),
    ),
  )
```

---

## 6. Handling Incoming Calls (FCM)

When an FCM message is received, extract the metadata:
```dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  if (message.data['type'] == 'INCOMING_CALL') {
    String sessionId = message.data['sessionId'];
    String appId = message.data['appId'];
    String channelName = message.data['channelName'];
    String token = message.data['token'];
    int uid = int.parse(message.data['uid']); // Backend sends strings in FCM

    // Navigate to Incoming Call Screen
  }
});
```

---

## 7. Status & Error Handling

- **Insufficient Balance**: The `/join` API will return `402 Payment Required`. Show a "Top up your balance" dialog.
- **Connection Lost**: Listen to `onConnectionStateChanged`. If state is `failed`, attempt to rejoin.
- **Call Ended**: Listen to the Socket event `consultation-auto-ended` (sent when balance runs out). Close the call UI immediately.

---

## 8. Mobile Checklist
- [ ] FCM background handler displays the call UI.
- [ ] Microphone and Camera permissions are handled gracefully.
- [ ] Speakerphone is enabled by default.
- [ ] User UID is strictly `1001` (User) or `2001` (Consultant) as provided by backend.
- [ ] `endSession` is called on the backend when the user clicks the red hang-up button.
- [ ] Resources are released using `_engine.leaveChannel()` and `_engine.release()`.

---
**Backend Support**: FixPair Dev Team  
**Last Updated**: 2026-06-05
