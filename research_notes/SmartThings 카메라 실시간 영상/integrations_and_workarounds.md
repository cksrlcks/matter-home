# SmartThings camera live video: what integrations do, and workarounds

Research date: 2026-09-29. Scope: SmartThings-cloud "AVPlatform" cameras (IMILAB C2C, SmartThings Cam, Arlo/Tapo via ST). Context from our own tests: `videoStream.startStream` returns `rtsps://gatewayXXXX.ec2.st-av.net:8556/<id>`, and the server answers 401 with `Basic realm="SmartThings AVPlatform"`. The API provides no credentials. Snapshots and clips from `mediaserv.*.st-av.net` work with a Bearer PAT.

## Q1. Does Home Assistant's SmartThings integration (including the 2025 pysmartthings v2+ rewrite) support cameras?

### Takeaway
No. As of 2026-09 the HA core `smartthings` integration has no camera platform, and it does not use `videoStream` or `imageCapture`. The maintainer says the integration only uses what the official SmartThings API exposes. No HA issue or PR adds camera streaming.

### Cited Findings
- HA SmartThings docs list these platforms: binary_sensor, button, climate, cover, event, fan, light, lock, media_player, number, scene, select, sensor, switch, time, update, vacuum, valve, water_heater. The page never mentions camera, video or imageCapture. — [HA SmartThings docs](https://www.home-assistant.io/integrations/smartthings/)
- The component directory on `home-assistant/core` (checked through the GitHub API, 2026-09-29) has no `camera.py`. It holds only the platform files listed above plus config_flow, diagnostics and similar. — [home-assistant/core smartthings component](https://github.com/home-assistant/core/tree/dev/homeassistant/components/smartthings)
- PR #165809 "Add camera fixture to SmartThings" (joostlek, merged 2026-03-18) only adds a test fixture for an Aqara G350 camera. It changes no code under `homeassistant/`, so no camera entity was added. — [PR #165809](https://github.com/home-assistant/core/pull/165809)
- GitHub Discussion #2226 "Smartthings family hub camera" (opened 2025-12-29, activity through 2026-08-06). Maintainer @joostlek: "The current integration only works with the SmartThings API, so if we can't fetch this data via the SmartThings API we can't really do this." Another participant says the fridge camera data "is available in the Smartthings API but is not documented in the official API spec". The only workaround mentioned is the old custom integration `ibielopolskyi/smartthings_fridge_camera`, which uses tokens that expire after 24h. The last comment raises SmartThings developer pricing changes as a new blocker. — [HA Discussion #2226](https://github.com/orgs/home-assistant/discussions/2226)
- A 2020 community thread shows the SmartThings Vision sensor arriving in HA only as a motion sensor. Users asked for richer data (person detection) and it was not exposed. — [HA community "SmartThings Vision" (2020-12)](https://community.home-assistant.io/t/smartthings-vision/250736)
- A GitHub search of `home-assistant/core` for "smartthings camera", "smartthings videoStream" and "smartthings imageCapture" returned no issue or PR about camera streaming. Results were unrelated startup and auth issues. — [GitHub search](https://github.com/home-assistant/core/issues?q=smartthings+camera)

### Inferences
- HA gives us nothing to copy. The SmartThings integration never tried to create camera entities, so there is no reverse-engineered AVPlatform auth to borrow.
- The maintainer's rule (use only the documented public API) means HA will not add RTSPS live view unless SmartThings documents how third parties authenticate to st-av.net.

### Gaps
- I found no HA issue that specifically reports the `st-av.net` 401 / "SmartThings AVPlatform" realm. No one appears to have documented it publicly.

## Q2. Do pysmartthings, @smartthings/core-sdk or smartthings-cli have video/stream helpers?

### Takeaway
No. They only know the capability names. None of them has a helper that starts a stream, gets RTSP credentials or downloads media.

### Cited Findings
- pysmartthings (`src/pysmartthings/capability.py`, main branch) defines enum constants such as `VIDEO_STREAM = "videoStream"`, `IMAGE_CAPTURE`, `VIDEO_CAPTURE`, `VIDEO_CLIPS`, `CAMERA_PRESET`, `BUFFERED_VIDEO_CAPTURE` and `SAMSUNG_CE_CAMERA_STREAMING`. — [pysmartthings capability.py](https://github.com/pySmartThings/pysmartthings/blob/main/src/pysmartthings/capability.py)
- The pysmartthings client (`smartthings.py`) has only generic methods: locations, rooms, devices, status, health, scenes, `execute_device_command`, SSE subscriptions and installed apps. There is no stream or media method. — [pysmartthings smartthings.py](https://github.com/pySmartThings/pysmartthings/blob/main/src/pysmartthings/smartthings.py)
- A GitHub issue search in pysmartthings for "camera" returned no results. — [pysmartthings issues](https://github.com/pySmartThings/pysmartthings/issues)
- @smartthings/core-sdk (latest npm 8.5.4) endpoint files: apps, capabilities, channels, devicepreferences, deviceprofiles, devices, drivers, history, hubdevices, installedapps, invites-schemaApp, locations, modes, notifications, organizations, presentation, rooms, rules, scenes, schedules, schema, services, subscriptions, virtualdevices. There is no video or media endpoint. — [core-sdk src/endpoint](https://github.com/SmartThingsCommunity/smartthings-core-sdk/tree/main/src/endpoint)
- SmartThings' own camera sample is the other direction. `webrtc-tutorial` is a Schema (C2C) tutorial that adds a webcam to SmartThings so it can be viewed in the SmartThings app. It does not pull video out. — [SmartThingsCommunity/webrtc-tutorial](https://github.com/SmartThingsCommunity/webrtc-tutorial)

### Inferences
- `startStream` can be sent from any SDK as a generic device command, which is what we already do. The part that is missing, AVPlatform RTSP credentials, is missing from every SDK. It is likely a private SmartThings app / AV-platform token flow and not part of the public PAT/OAuth scopes.

### Gaps
- smartthings-cli was not inspected separately. It is built on core-sdk, so I infer it has no video command either, but I did not verify this.

## Q3. Do other projects (Homebridge, Hubitat, openHAB, go2rtc, Scrypted, Node-RED) get live view from SmartThings cameras?

### Takeaway
I found no successful live-view report from any project for SmartThings-hosted cameras. Every bridge that sees these devices exposes only their switch, motion and battery parts, and flags the video capabilities as unknown or unsupported.

### Cited Findings
- homebridge-smartthings (tonesto7) issue #405 "[Feature Request] Samsung smarthings cam support" (2021-01-17, still open). The plugin logs `Unknown Capabilities: ["Image Capture",...,"Video Capture","Sound Sensor","Video Stream","Video Clips","Object Detection","Audio Stream"]`, and the camera appears only as a switch. — [tonesto7/homebridge-smartthings#405](https://github.com/tonesto7/homebridge-smartthings/issues/405)
- homebridge-smartthings (iklein99) issue #129 "Arlo Essential Cameras" (2023-01-24, open). Arlo cameras added via SmartThings appear in Homebridge as a switch, a motion sensor and a battery, with no stream. — [iklein99/homebridge-smartthings#129](https://github.com/iklein99/homebridge-smartthings/issues/129)
- Hubitat "HubiThings Replica" (bloodtick) new-device requests:
  - Issue #14 is a Tapo C125. The device is `c2c-tplink-camera-motion`, type VIPER, with capabilities `videoStream`, `motionSensor`, `refresh` and `healthCheck` (2024-02-10).
  - Issue #15 is an Arlo doorbell with `videoStream` and `videoCapture` (2024-02-12).
  - The discussion covers only battery, motion and refresh. No video is bridged.
  — [bloodtick/Hubitat#14](https://github.com/bloodtick/Hubitat/issues/14); [bloodtick/Hubitat#15](https://github.com/bloodtick/Hubitat/issues/15)
- SmartThings Community, "Can I access video streams with smartthings api" (2025-01-11/12), about a Tapo camera. Community member h0ckeysk8er: "any access to video would have to be provided by the vendor since they are responsible for the integration" and "you would need to contact the camera vendor to see if they make that available via an API." — [ST Community #293476](https://community.smartthings.com/t/can-i-access-video-streams-with-smartthings-api/293476)
- Scrypted's plugin list (Arlo, Google Device Access, Tuya, Wyze, Amcrest, Hikvision, Reolink, Tapo, Doorbird, UniFi Protect, and others) has no SmartThings camera plugin. — [Scrypted](https://www.scrypted.app/); [koush/scrypted](https://github.com/koush/scrypted)
- The go2rtc README has no SmartThings source. go2rtc issue #1996 "Support for Matter cameras" (2025-12-22, open) is only a tracking issue. AlexxIT: "I like to work with live devices, not blindly" (2025-12-24). — [go2rtc README](https://github.com/AlexxIT/go2rtc); [go2rtc#1996](https://github.com/AlexxIT/go2rtc/issues/1996)
- SmartThings added Matter 1.5 camera support (live streaming, clip storage, two-way talk) on 2025-12-18, with Aqara, Eve and Xthings cameras due in early 2026. The post says nothing about third-party API access to the streams. — [SmartThings blog 2025-12-18](https://blog.smartthings.com/smartthings-updates/smartthings-expands-camera-support-with-introduction-of-matter-1-5/)
- Older community threads such as "Generic Video Camera DeviceType, Yes, Live Video Streaming" (Groovy era, circa 2016) bring RTSP cameras into the SmartThings app, the opposite direction. — [ST Community #45657](https://community.smartthings.com/t/release-generic-video-camera-devicetype-yes-live-video-streaming/45657)

### Inferences
- The 401 on `st-av.net` matches every public report we found: no open-source project has cracked or documented AVPlatform auth for PAT/OAuth clients.
- openHAB and Node-RED SmartThings bindings/nodes wrap the same REST API. I did not find camera support in either, but I did not check them one by one.
- Matter 1.5 cameras (WebRTC) could later be bridged directly by Matter-capable tools, bypassing SmartThings. That does not help the IMILAB C2C camera.

### Gaps
- openHAB and Node-RED SmartThings camera support was not checked individually. No results came up in the searches.
- The SmartThings Community thread on `c2c-camera-rtsp-3` startStream test failures (2024-12-16) did not describe the AVPlatform relay auth in the part I could read. — [ST Community #287272](https://community.smartthings.com/t/camera-startstream-test-suite-failed/287272/8)

## Q4. Workarounds for viewing a SmartThings camera's live video in a personal web app, with feasibility and effort

### Takeaway
The practical ranking:
1. For IMILAB/Xiaomi cameras, bypass SmartThings with **go2rtc's native `xiaomi://` source**. It logs in with the camera owner's Mi account, gives true live H.265 video with audio, and serves WebRTC/MSE/HLS to a browser.
2. **Snapshot polling** via `imageCapture.take` plus mediaserv, which already works for us. This gives near-live frames every few seconds.
3. **Screen capture of the SmartThings app** (Android device or emulator plus scrcpy, then ffmpeg to a stream). This is the fallback that works for any camera, but it is fragile.

Casting or TV mirroring does not help a web app.

### Cited Findings
- **Vendor-native path (IMILAB = Xiaomi "chuangmi" models):**
  - go2rtc has had a `xiaomi` source since v1.9.13 (released 2025-12-14), expanded in v1.9.14 (2026-01-19). It logs into the Mi Home account through the go2rtc WebUI (with email/SMS code and captcha if required). The config looks like `xiaomi://<uid>:<region>@<ip>?did=...&model=...`.
  - The README notes: "Each time you connect to the camera, you need Internet access to obtain encryption keys" and "Connection to the camera is local only". Two-way audio is supported.
  - "Not all cameras are supported". The support list is issue #1982.
  — [go2rtc xiaomi README](https://github.com/AlexxIT/go2rtc/blob/master/internal/xiaomi/README.md); [go2rtc releases](https://github.com/AlexxIT/go2rtc/releases)
- In go2rtc issue #1982 "Known Xiaomi cameras", users report IMILAB/chuangmi models working:
  - Working: IMILAB EC3 Pro `chuangmi.camera.042a02` (cs2+udp, H265, 2025-12-15), C500 Pro `chuangmi.camera.061a03`, C700 `chuangmi.camera.81ac1` (4K with subtype=3), `chuangmi.camera.ipc009` ("works… see video in HA WebRTC card", 2026-01-20), IMILAB Basic `chuangmi.camera.ipc016` (tutk, working 2026-09-24).
  - With a patch: IMI 1080P `chuangmi.camera.ipc017` (2026-07-28).
  - Failing: `chuangmi.camera.ipc013d`, `ipc019e`, `ipc020`, and `chuangmi.camera.v2` ("unsupported model").
  — [go2rtc#1982](https://github.com/AlexxIT/go2rtc/issues/1982)
- Active go2rtc Xiaomi work as of 2026-09:
  - PR #2492 re-logs into the Xiaomi cloud when the session expires (2026-09-13).
  - PR #2450 fixes login after phone verification (2026-08-25).
  - PR #2531 adds PTZ (2026-09-28).
  - Issue #2470 reports cameras going offline intermittently (2026-09-06).
  — [go2rtc#2492](https://github.com/AlexxIT/go2rtc/pull/2492); [go2rtc#2450](https://github.com/AlexxIT/go2rtc/pull/2450); [go2rtc#2531](https://github.com/AlexxIT/go2rtc/pull/2531); [go2rtc#2470](https://github.com/AlexxIT/go2rtc/issues/2470)
- A 2026 guide recommends the go2rtc Xiaomi source for C200/C300/C400/C500 Pro/Mi 360 2K Pro. Its "Plan B" for unsupported models is Xiaomi → Miloco → micam → local RTSP → go2rtc. — [marklabs.pl 2026 guide](https://marklabs.pl/en/xiaomi-cameras-in-home-assistant-2026-c200-c300-c400-go2rtc-2026/)
- The official Xiaomi HA integration (`xiaomi_home`) does not give a normal live feed. Video uses encrypted P2P with keys negotiated between the Mi Home app and the camera. The `hass-xiaomi-miot` integration can play video only if the model's miot-spec defines the `camera-stream-for-google-home` service. — [marklabs.pl guide](https://marklabs.pl/en/xiaomi-cameras-in-home-assistant-2026-c200-c300-c400-go2rtc-2026/); [hass-xiaomi-miot#2547](https://github.com/al-one/hass-xiaomi-miot/issues/2547)
- **Other vendors:** Scrypted has native plugins for Arlo, Tapo, Tuya, Wyze, Google/Nest, UniFi and others. A camera that is in SmartThings through one of those clouds can be streamed from the vendor side instead. — [Scrypted](https://www.scrypted.app/)
- **App screen capture:** scrcpy mirrors and controls an Android device over ADB, so the SmartThings app's live view can be captured on a PC and re-encoded (for example ffmpeg → go2rtc → WebRTC). — [Genymobile/scrcpy](https://github.com/Genymobile/scrcpy)

### Inferences (feasibility / effort)
1. **go2rtc `xiaomi://` (recommended if the IMILAB model is on the #1982 list)**
   - Effort: low to medium. Run a go2rtc container on the LAN, log in once, then embed its WebRTC/MSE player or `/api/stream.mp4` / HLS in the Next.js app.
   - Latency is sub-second. It needs Internet for the key exchange, and the Mi-cloud session can expire (PR #2492 addresses this).
   - First step: identify the camera's Mi Home model id (the `chuangmi.camera.xxx` string) and check it against #1982.
2. **Snapshot polling via SmartThings (works today, zero new infra)**
   - Effort: very low. Call `imageCapture.take`, then fetch the mediaserv image with the PAT on the server side and refresh the `<img>` every N seconds.
   - Limits: it is not video (seconds per frame), each take can wake or upload from the camera, and it is subject to SmartThings rate limits. Treat it as a "live-ish" preview.
3. **Short clips (`videoCapture` / `videoClips`) via mediaserv**
   - Effort: low, reusing the snapshot path. This gives recent clips, not live video.
4. **Android device or emulator + SmartThings app + scrcpy/ffmpeg**
   - Effort: high, and fragile. The app must stay on the live-view screen, sessions time out, UI automation is needed to recover, and quality is a screen re-encode.
   - Emulators may be blocked by the SmartThings app or by DRM/secure surfaces. This is unverified; I found no source either way.
   - Lawful for the owner, but a last resort.
5. **Cast the SmartThings app to a Chromecast/TV**
   - Not useful for a web app, because the output goes to a TV and not into a stream you can re-serve. Skip it.
6. **Reverse-engineer the AVPlatform RTSP credentials from the SmartThings app's traffic**
   - Technically conceivable, but no public project has done it. It would likely violate SmartThings terms and break without notice. Not recommended.
7. **Future: Matter 1.5 cameras**
   - A Matter camera could be paired to multiple controllers and streamed over WebRTC without SmartThings. Tooling (go2rtc #1996) was not ready as of 2026-09. This does not apply to current C2C cameras.

### Gaps
- I did not verify which exact IMILAB model(s) the user owns or whether they appear on go2rtc #1982. This needs the Mi Home model id.
- I found no source on whether the SmartThings Android app refuses to run in emulators or uses FLAG_SECURE on live view, which would block screen capture.
- SmartThings API rate limits for repeated `imageCapture.take` were not researched.
- No source documents the SmartThings developer pricing change mentioned in HA Discussion #2226, or whether it affects PAT use.
