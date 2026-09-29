# SmartThings AVPlatform (st-av.net) RTSPS live stream: third-party authentication and playback

Research date: 2026-09-29. Scope: IMILAB "imi.camera.default" (cloud-to-cloud camera, presentationId SmartThings-smartthings-AVPlatform_IMI_IPC019D_Camera), stream URL rtsps://gatewayXXXX.ec2.st-av.net:8556/<id>, RTSP server banner "avcore/1.15", challenge `WWW-Authenticate: Basic realm="SmartThings AVPlatform"`.

Bottom line: **No public source (SmartThings developer docs, SmartThings Community, GitHub, Reddit, Home Assistant forums) documents credentials for the st-av.net RTSP gateway, and no report was found of anyone playing an st-av.net rtsps stream with VLC/ffmpeg/go2rtc.** SmartThings staff and moderators state repeatedly that live video from cloud-to-cloud cameras is not exposed to third parties via the SmartThings API and direct such requests to the camera vendor.

## Q1. What credentials does the AVPlatform RTSP gateway expect? Any successful third-party playback reported?

### Takeaway
Undocumented publicly. Searches for "st-av.net", "OutHomeURL", "InHomeURL", "SmartThings AVPlatform", and "avcore" surfaced no report of successful VLC/ffmpeg/go2rtc playback and no description of the username/password scheme.

### Cited Findings
- The `videoStream.stream` value format documented for integrators (the device/vendor side) is `{"InHomeURL": "...", "OutHomeURL": "..."}`. In that integrator model, credentials are embedded in the URL, e.g. `rtsp://user:pass@192.168.0.6:554/streamurl`. Staff (nayelyz) also listed two pre-published device profiles: `c1ca6938-e152-4a21-a349-d89df268f126` (RTSP) and `d1fddebd-137b-47fa-a05a-6e8329de19e0` (WebRTC). Posted 2021-10-01 — [SmartThings Community: VideoStream codec thread](https://community.smartthings.com/t/capabilities-reference-videostream-no-video-codec-and-audio-codec-information/232325)
- Community driver author TAustin raised that "RTSP commands require authorization, yet there's no way to provide user and password" other than in the URL, and that credentials appear "in the clear" and in event history (2022-04-12 and 2022-05-02) — [same thread](https://community.smartthings.com/t/capabilities-reference-videostream-no-video-codec-and-audio-codec-information/232325)
- The legacy Groovy-era video player example event carried `OutHomeURL`, `InHomeURL`, `ThumbnailURL`, and a `cookie: [key, value]` field, i.e. the old schema had a side channel for auth alongside the URL. Sample values were HLS `.m3u8` placeholders, not RTSP — [SmartThingsPublic tile-multiattribute-videoplayer.groovy](https://github.com/SmartThingsCommunity/SmartThingsPublic/blob/master/devicetypes/smartthings/tile-ux/tile-multiattribute-videoplayer.src/tile-multiattribute-videoplayer.groovy)
- The only public mention of `mediaserv.*.st-av.net` (2021-03-28): Aeotec Cam 360 image/clip URLs (`https://mediaserv.euw1.st-av.net/image?source_id=...`) returned "Request missing Bearer token" with no auth, and 403 Forbidden with a SmartThings token as Bearer. Aeotec support replied: "For security reasons, use of the camera outside of SmartThings app has been disabled." (2021-03-29) — [SmartThings Community: Getting images from Aeotec Cam 360](https://community.smartthings.com/t/getting-images-from-aeotec-cam-360/223596)

### Inferences
- The rtsps URL resolves to a SmartThings-operated relay (st-av.net, banner "avcore"), not to the IMILAB device directly. In a C2C integration the vendor supplies the stream to the SmartThings AVPlatform, which re-publishes it behind its own `realm="SmartThings AVPlatform"`. So the Basic credential is issued by SmartThings, not IMILAB.
- Our own test result (PAT works as `Bearer` on mediaserv image/clip in 2026 but fails on the RTSP gateway as username, password, and Bearer) is consistent with the RTSP relay expecting a different, app-issued short-lived credential rather than the PAT. This is an inference; no source confirms the mechanism.
- The 2021 Aeotec 403-on-mediaserv report contradicts our 2026 200-with-PAT result, suggesting the still-image/clip access policy changed between 2021 and 2026, while the live RTSP relay stayed closed.

### Gaps
- No public source gives the AVPlatform RTSP credential format, its issuer, or expiry.
- No public reverse-engineering writeup of the SmartThings mobile app live-view flow was found.
- No public report of go2rtc/ffmpeg/VLC opening an st-av.net rtsps URL.

## Q2. Is an OAuth SmartApp/Schema token, special scopes/headers, or an alternate endpoint (WebRTC/HLS/clip API) required or available to third parties?

### Takeaway
The public SmartThings API exposes `videoStream` (startStream/stopStream commands, `stream` attribute), `webrtc`, `videoCapture`, and `imageCapture` capabilities, but staff say the live stream itself is not made available to third parties; SmartThings is now steering integrators to WebRTC and calls RTSP "legacy."

### Cited Findings
- Staff (howonKim) 2026-07-29: "we recommend implementing C2C using WebRTC. RTSP is currently in legacy status," and "talkback is not supported on C2C devices." — [SmartThings Community: ST-Schema Camera, WebRTC, audio codec](https://community.smartthings.com/t/capabilities-reference-videostream-no-video-codec-and-audio-codec-information/232325?page=4)
- WebRTC C2C flow (staff nayelyz): the device/connector returns an `sdpAnswer` in response to an `sdpOffer` sent when the app play button is clicked — [SmartThings Community: ST-Schema Camera Integration WebRTC](https://community.smartthings.com/t/issue-with-st-schema-camera-integration-webrtc-and-device-status/303046) (2025-07)
- SmartThings publishes a Schema WebRTC tutorial repo for adding a webcam to an account and viewing it in the SmartThings app — [SmartThingsCommunity/webrtc-tutorial](https://github.com/SmartThingsCommunity/webrtc-tutorial)
- A user (minh_nguyen, 2025-01-11) observed "Start live stream" / "List live stream" actions in the Samsung account permissions UI and noted they are "absent from SmartThings public API documentation." No public API for them was identified in the thread — [SmartThings Community: Can I access video streams with SmartThings API](https://community.smartthings.com/t/can-i-access-video-streams-with-smartthings-api/293476)

### Inferences
- These findings describe the integrator (device-onboarding) side, not a consumer-side "give me a playable stream" API. The consumer play path (app -> AVPlatform relay) is what our rtsps URL belongs to, and it is not covered by any documented public endpoint.
- Because SmartThings labels RTSP "legacy" and pushes WebRTC, a lasting third-party RTSP path is unlikely even if a credential were found.

### Gaps
- No documented public endpoint returns AVPlatform stream credentials or an HLS/DASH alternative to third parties.
- Whether special headers (X-ST-Client / X-ST-Api-Version) change the RTSP gateway response is unverified by any source.

## Q3. Does SmartThings officially state camera live streams are unavailable to third parties?

### Takeaway
Yes. Moderators and staff state that live video for C2C cameras must come from the vendor, not the SmartThings API, and frame external access as a security/authorization boundary.

### Cited Findings
- Moderator h0ckeysk8er (Bruce Pinsky), 2025-01-12: "any access to video would have to be provided by the vendor since they are responsible for the integration," and, asked if an ST API exists: "No, it means you would need to contact the camera vendor to see if they make that available via an API" — [Can I access video streams with SmartThings API](https://community.smartthings.com/t/can-i-access-video-streams-with-smartthings-api/293476)
- Staff nayelyz, 2024-08-05, on getting a live stream: "to get the live stream you need to see the option offered by the manufacturer, in this case, Ring as we're not the original source/owner of this information," and "this would be a security issue since the users are authorizing access to Smartthings when they link their accounts, not to third parties" — [Ring streaming live video to custom app](https://community.smartthings.com/t/ring-streaming-live-video-from-ring-camera-to-custom-android-application/285272)
- Aeotec support via user, 2021-03-29: "For security reasons, use of the camera outside of SmartThings app has been disabled." — [Getting images from Aeotec Cam 360](https://community.smartthings.com/t/getting-images-from-aeotec-cam-360/223596)
- Matter 1.5 (SmartThings Blog, 2025-12-18) adds native Matter camera support with "Live streaming — Watch your home in real time," and notes "manufacturers can deploy Matter cameras without building separate APIs." It does not describe any third-party API for external stream access — [SmartThings Blog: Matter 1.5 cameras](https://blog.smartthings.com/smartthings-updates/smartthings-expands-camera-support-with-introduction-of-matter-1-5/)

### Inferences
- The consistent official position (2021 through 2026) is that live stream access is intentionally scoped to the SmartThings app and the vendor, not to third-party API clients holding a PAT. Our 401 on the RTSP gateway is the expected, by-design outcome, not a misconfiguration.

### Gaps
- No single doc page states "third parties cannot play AVPlatform streams" verbatim; the position is expressed through staff/moderator answers and vendor statements rather than a formal API doc clause.

## Q4. Any reverse-engineering of the app's live-view flow?

### Takeaway
None found in public sources.

### Cited Findings
- No GitHub project, blog, or forum writeup describing capture/decompilation of the SmartThings app's camera live-view auth was located. GitHub hits for `InHomeURL`/`OutHomeURL` are limited to the legacy Groovy device handler with placeholder values — [SmartThingsPublic device handler](https://github.com/SmartThingsCommunity/SmartThingsPublic/blob/master/devicetypes/smartthings/tile-ux/tile-multiattribute-videoplayer.src/tile-multiattribute-videoplayer.groovy)

### Gaps
- No public reverse-engineering of the AVPlatform live-view handshake exists that could reveal the credential source.

## Constraints / legality note
- SmartThings Developer Terms of Service prohibit reverse engineering, decompiling, or attempting to discover the source or underlying algorithms of SmartThings Developer Tools not provided in source form — [SmartThings Developer Terms of Service](https://developer.smartthings.com/termsofservice). Decompiling the app or capturing its private traffic to extract the AVPlatform credential would run against these terms even though the user owns the account and cameras.
- Account-owner, in-ToS approaches that remain open: (1) use the SmartThings app for live view; (2) if IMILAB/IMILAB's own app or cloud exposes an owner-facing API, obtain the stream from the vendor directly (the path staff repeatedly recommend); (3) use `imageCapture`/`videoCapture` still/clip endpoints via mediaserv, which our 2026 testing shows respond 200 to `Bearer <PAT>` (snapshots, not live video); (4) for future/Matter 1.5 cameras, native Matter live streaming may open a supported local/standard path that RTSP-over-st-av.net does not.

## Source list
- https://community.smartthings.com/t/capabilities-reference-videostream-no-video-codec-and-audio-codec-information/232325
- https://community.smartthings.com/t/capabilities-reference-videostream-no-video-codec-and-audio-codec-information/232325?page=4
- https://community.smartthings.com/t/can-i-access-video-streams-with-smartthings-api/293476
- https://community.smartthings.com/t/ring-streaming-live-video-from-ring-camera-to-custom-android-application/285272
- https://community.smartthings.com/t/getting-images-from-aeotec-cam-360/223596
- https://community.smartthings.com/t/issue-with-st-schema-camera-integration-webrtc-and-device-status/303046
- https://github.com/SmartThingsCommunity/webrtc-tutorial
- https://github.com/SmartThingsCommunity/SmartThingsPublic/blob/master/devicetypes/smartthings/tile-ux/tile-multiattribute-videoplayer.src/tile-multiattribute-videoplayer.groovy
- https://blog.smartthings.com/smartthings-updates/smartthings-expands-camera-support-with-introduction-of-matter-1-5/
- https://developer.smartthings.com/termsofservice
