# IMILAB 카메라 직접 스트리밍 (SmartThings 우회) — 조사 노트 (작성 2026-09-29)

## Q1. "IPC019D"는 어떤 모델이고, 어떤 IMILAB 모델이 RTSP/ONVIF를 공식 지원하나?

### Takeaway
IPC019D는 Shanghai Imilab이 만든 **"SmartThings Cam 360"(국내명 "스마트싱스 전용 홈카메라360")**으로, 포엠아이(POEMI)가 판매했고 **SmartThings 앱 전용**이며 현재 판매 중지 상태다. 이 모델에 공식 RTSP/ONVIF 지원이 있다는 근거는 찾지 못했다. 공식 ONVIF 지원이 문서로 확인되는 IMILAB 모델은 EC6 Dual 계열뿐이다.

### Cited Findings
- FCC ID 2APA9-IPC019D는 Shanghai Imilab Technology Co., Ltd.의 "SmartThings Cam 360"이다. — [fccid.io](https://fccid.io/2APA9-IPC019D), [electric.garden](https://electric.garden/shanghai-imilab-2apa9/smartthings-cam-360-ipc019d)
- 형제 모델 IPC019E는 "IMILAB Home Security Camera A1"(Xiaomi 모델 코드 cmsxj19e)이며 Mi Home/Xiaomi Home 앱으로 제어한다. — [fccid.io IPC019E](https://fccid.io/2APA9-IPC019E), [cmsxj19e-hacks](https://github.com/cstrassburg/cmsxj19e-hacks)
- Mi Home의 모델 ID `chuangmi.camera.ipc019`은 "小米智能摄像机云台版"(샤오미 스마트 카메라 PTZ 버전)이다. — [Mi Home 소개 페이지](https://home.mi.com/views/introduction.html?region=cn&pdid=66703&model=chuangmi.camera.ipc019)
- 삼성닷컴 상품 페이지: "스마트싱스 전용 홈카메라360", 판매사 포엠아이, 앱은 SmartThings만 명시, 360° 팬/틸트, 양방향 음성, 태블릿/TV/패밀리허브에서 시청 가능, 상태는 "판매중지". 이 페이지에 RTSP/ONVIF 언급은 없다. — [Samsung SEC](https://www.samsung.com/sec/smartthings/IPC019D/IPC019D/)
- 한국 쪽 검색 요약에서도 이미랩 "SmartThings 홈카메라 360(IPC019D)"이 단종되어 새 제품을 구하기 어렵다고 나온다. — [Samsung SEC](https://www.samsung.com/sec/smartthings/IPC019D/IPC019D/), [YouTube 리뷰](https://www.youtube.com/watch?v=5jiOre8RPoo)
- IMILAB EC6 Dual(2K/3K): 매뉴얼에 ONVIF NVR 연결 방법이 있다(NVR에서 "Add manually" → 프로토콜 [ONVIF] 선택 → 메인/서브 스트림 자동 획득, 렌즈 두 개는 각각 추가). IP 주소는 Mi Home에 바인딩한 뒤 확인한다. — [ManualsLib EC6 Dual](https://www.manualslib.com/manual/3540379/Imilab-Ec6-Dual.html), [manuals.plus EC6 Dual 2K](https://manuals.plus/imilab-global/ec6-dual-2k-wifi-spotlight-camera-manual)
- IMILAB C22: IMILAB Home 앱이 아니라 Mi Home 앱으로 페어링한다. — [NotEnoughTech](https://notenoughtech.com/home-automation/imilab-c22/)
- HA 커뮤니티(2019~2020 게시글) 기준, IMILAB은 Mi Home 외에 API나 다른 제어 수단은 없고 앞으로도 없을 것이라고 답했다. — [HA Community: Imilab camera support](https://community.home-assistant.io/t/imilab-camera-support-integration-in-hassio/136606), [HA Community: EC2](https://community.home-assistant.io/t/xiaomi-imilab-ec2-integration-with-homeassistant/223353)
- 일반 Xiaomi 계열 모델에는 공통 RTSP/ONVIF URL이 없고, 지원 여부는 모델, 하드웨어 리비전, 지역, 펌웨어에 따라 다르다. — [smartrtsp.com Xiaomi guide](https://www.smartrtsp.com/cameras/xiaomi)

### Inferences
- IPC019D는 IPC019 플랫폼(= chuangmi.camera.ipc019 / IMILAB A1 계열)을 SmartThings 클라우드 전용 펌웨어로 바꾼 파생 모델일 가능성이 높다(모델 번호 접미사 D/E 패턴 기준). 다만 Mi Home에 등록되는지는 확인하지 못했다. SmartThings 전용 펌웨어라면 Xiaomi 클라우드 계정에 기기가 올라가지 않으므로, 아래 Q2의 Xiaomi 계열 도구는 모두 못 쓸 가능성이 크다.
- 새로 사서 RTSP/ONVIF를 쓰려면 공식 ONVIF가 문서화된 EC6 Dual 계열이 가장 안전하다.

### Gaps
- IPC019D 매뉴얼 원문(fccid.io / usermanual.wiki / manuals.plus)은 403이 떠서 읽지 못했다. 앱 종류와 프로토콜을 직접 확인하지 못했다.
- IPC019D를 초기화한 뒤 Mi Home / IMILAB Home 앱으로 등록할 수 있는지 다룬 출처가 없다.
- C20/C21/C30/EC4의 공식 RTSP/ONVIF 지원 여부는 확인 자료가 없다(찾은 범위 안에서는 지원한다는 증거가 없다).

## Q2. Xiaomi/Mi Home 기반 접근 (go2rtc xiaomi, hass-xiaomi-miot, micam/miloco, 공식 Xiaomi Home)

### Takeaway
go2rtc v1.9.13+의 `xiaomi` 소스가 현재(2026) 가장 실용적인 경로다. 알려진 동작 모델 목록에 **`chuangmi.camera.ipc019`(2019, cs2+udp, HEVC/PCMA)**와 IMILAB EC3 Pro/EC5가 있다. 단, **Mi Home(Xiaomi 계정)에 등록된 카메라만** 대상이다. SmartThings 전용 IPC019D에 적용된다는 증거는 없다. 공식 Xiaomi Home HA 통합은 영상을 지원하지 않는다.

### Cited Findings
- go2rtc `xiaomi` 소스는 v1.9.13에서 추가되었다. 포맷은 `xiaomi/mess`와 `xiaomi/legacy`, P2P 프로토콜은 `cs2+udp`, `cs2+tcp`, `tutk+udp`를 지원한다. mess+cs2는 대부분 잘 되고, legacy/tutk는 문제가 있다. 로그인은 WebUI → Add → Xiaomi에서 계정/비밀번호를 넣고, 필요하면 이메일/SMS 인증과 CAPTCHA를 거친다. 여러 계정과 여러 지역을 지원하고, 양방향 오디오와 품질 선택(`subtype=hd/sd/auto/0-5`)이 된다. 암호화 키를 받으려고 **연결할 때마다 인터넷이 필요하지만, 영상 자체는 로컬 연결**이다. — [go2rtc xiaomi README](https://github.com/AlexxIT/go2rtc/blob/master/internal/xiaomi/README.md), [go2rtc.org](https://go2rtc.org/internal/xiaomi/)
- URL 형식: `xiaomi://<userid>:<region>@<ip>?did=<did>&model=<model>` (예: `xiaomi://1234567890:cn@192.168.1.123?did=9876543210&model=isa.camera.hlc7`). — [go2rtc xiaomi README](https://github.com/AlexxIT/go2rtc/blob/master/internal/xiaomi/README.md)
- "Known Xiaomi cameras" 이슈(#1982)의 동작 목록: `chuangmi.camera.ipc019`(2019, cs2+udp, HEVC/PCMA), `chuangmi.camera.ip029a`, `chuangmi.camera.021a04/029a02/039a04/046c04/051a01/055a02/055c02/061a03/068ac1/069a01/075ae1/079ae2` 등, imilab EC3 Pro(042a02), EC5(055a02, 055c02), `isa.camera.hlc6/hlc7/hlc8/hlmax/700sa`. 미지원: `chuangmi.camera.v6`, `loock.cateye.v01`. 2017~2019년 legacy/TUTK 모델은 제한적으로만 지원한다. — [go2rtc issue #1982](https://github.com/AlexxIT/go2rtc/issues/1982)
- IMILAB EC6 Dual Pro 3K는 go2rtc에서 두 스트림 모두 정상 표시된다는 보고가 있다. — [go2rtc issue #2074 등 검색 결과](https://github.com/AlexxIT/go2rtc/issues/2074)
- Frigate 0.17 beta + go2rtc 1.9.13(chuangmi.camera.046c04) 사례: 스트림이 HEVC라 GPU가 해당 HEVC 프로파일을 지원하지 않으면 ffmpeg이 죽는다. `hwaccel_args: []`로 CPU 디코딩하도록 권고했다. — [Frigate discussion #21421](https://github.com/blakeblackshear/frigate/discussions/21421)
- hass-xiaomi-miot(al-one): `chuangmi.camera.ipc019`에서 클라우드 HLS URL은 받아지지만 403 Forbidden으로 재생에 실패했다. 이슈는 해결 없이 "not planned"로 닫혔다(2022-08-29). 다른 chuangmi/IMILAB(EC5) 모델에서도 스트림 주소가 비어 있거나 P2P 스트림 엔티티가 없는 문제가 반복 보고된다. — [issue #761](https://github.com/al-one/hass-xiaomi-miot/issues/761), [issue #2547](https://github.com/al-one/hass-xiaomi-miot/issues/2547), [issue #2620](https://github.com/al-one/hass-xiaomi-miot/issues/2620)
- 공식 XiaoMi/ha_xiaomi_home: 카메라 영상/사진 가져오기를 설계상 지원하지 않고 앞으로도 구현하지 않는다고 한다(스트림이 종단간 암호화되어 Mi Home 앱에서만 복호화 가능). 대안으로 go2rtc를 언급한다. — [ha_xiaomi_home discussion #78](https://github.com/XiaoMi/ha_xiaomi_home/discussions/78)
- micam(miiot/micam): 비공식 RTSP 브리지. 샤오미 공식 **Miloco**를 기반으로 go2rtc를 붙여 Docker Compose로 배포하고, HA/Frigate/Scrypted/HomeKit으로 RTSP 재송출하며 GPU가 필요 없다. HA 커뮤니티 글에는 악성 포크 저장소를 주의하라는 경고가 있다. — [github.com/miiot/micam](https://github.com/miiot/micam), [HA Community](https://community.home-assistant.io/t/xiaomi-mijia-cameras-now-supports-rtsp-stream/954583)
- IMILAB의 신형 모델(C22, EC6 등)은 Mi Home으로 바인딩한다. — [NotEnoughTech C22](https://notenoughtech.com/home-automation/imilab-c22/), [ManualsLib EC6 Dual](https://www.manualslib.com/manual/3540379/Imilab-Ec6-Dual.html)

### Inferences
- 모든 Xiaomi 계열 도구는 **Xiaomi 계정(Mi Home) 클라우드에 등록된 기기**를 전제로 한다. 별도 클라우드인 IMILAB Home 앱이나 SmartThings에만 등록된 기기는 did/토큰을 얻을 수 없어 쓸 수 없을 것으로 본다. 따라서 IPC019D는 (a) Mi Home 등록이 가능한지부터 확인해야 한다. 가능하다면 (b) model이 `chuangmi.camera.ipc019`로 잡히면 go2rtc로 바로 될 가능성이 높다.
- 한국 지역: go2rtc는 여러 지역 서버를 지원하지만, 한국 판매 기기의 Mi Home 지역 코드(sg/i2 등)에 대한 자료는 찾지 못했다.
- 웹앱 연동 구성: go2rtc(xiaomi 소스) → WebRTC/MSE/HLS로 브라우저에 직접 제공, 또는 RTSP로 재송출해 Frigate에 연결. 영상이 HEVC라 브라우저 WebRTC 호환성 때문에 H.264 트랜스코딩(ffmpeg)이 필요할 수 있다.

### Gaps
- IMILAB Home 앱 계정 기기를 go2rtc/miot가 지원하는지 명시한 출처가 없다.
- 한국 지역 Xiaomi 서버에서 go2rtc xiaomi 소스가 동작하는지 확인한 보고가 없다.
- micam/Miloco의 지원 모델 목록(chuangmi.camera.ipc019 포함 여부)은 확인하지 못했다.

## Q3. 커스텀/해킹 펌웨어, 기타 클라우드(Tuya), 한국 커뮤니티 자료

### Takeaway
IPC019 계열(A1, cmsxj19e)용 해킹은 SigmaStar SSC323 기반의 루트/텔넷 수준에 머물러 있고 **RTSP는 미완성**이다. 펌웨어 3.5.8_0166 이상에서는 막혀 있다. Ingenic T31 계열(yi-hack, Dafang 등) 해킹은 IPC019와 SoC가 달라 해당되지 않는다. IMILAB이 Tuya를 쓴다는 근거는 없다. 한국어 커뮤니티에서 이미랩 RTSP/홈어시스턴트 연동 자료는 찾지 못했다.

### Cited Findings
- cmsxj19e-hacks(IMILAB A1, ipc019e): 루트 권한과 텔넷을 연다. RTSP, 모터 드라이버, 파일시스템 마운트는 "다음 단계"로 남아 있다. SoC는 SigmaStar SSC323(ARMv7), 64MB RAM. 펌웨어 3.5.8_0165까지만 동작하고, **3.5.8_0166에서 공개키와 부트로더가 바뀌어 다운그레이드가 불가능**하다. 설치는 SD카드로 하며, 대안은 분해 후 시리얼/SPI 프로그래머. "개발 중" 상태다. — [cstrassburg/cmsxj19e-hacks](https://github.com/cstrassburg/cmsxj19e-hacks)
- HA 커뮤니티에 IMILAB A1(CMSXJ19E) 지원 요청 스레드가 있다. — [HA Community](https://community.home-assistant.io/t/support-for-imilab-a1-smart-ip-camera-cmsxj19e/304341)
- 한국어 검색("이미랩 카메라 RTSP 홈어시스턴트", "스마트싱스 캠 360 이미랩 RTSP")에서는 제품 리뷰와 판매 페이지만 나오고 RTSP/HA 연동 사례는 없었다. — [YouTube 리뷰](https://www.youtube.com/watch?v=5jiOre8RPoo), [Samsung Members 글](https://r1.community.samsung.com/t5/smartthings/%ED%9B%84%EA%B8%B0-%EC%8B%B1%EC%8A%A4%EC%9B%90-t1-%ED%99%88-%EC%B9%B4%EB%A9%94%EB%9D%BC-%EA%B0%9C%EB%B4%89%EA%B8%B0/m-p/39427205)

### Inferences
- IPC019D가 IPC019E와 같은 보드라면 cmsxj19e-hacks의 루트 획득 방식이 통할 수는 있다. 하지만 RTSP 서버를 직접 올려야 하고, SmartThings 펌웨어 버전이나 서명 체계가 다를 수 있으며, 벽돌화와 보증 상실 위험이 있어 실용성이 낮다.
- 실용 우선순위(소유자 합법 범위): ① IPC019D를 Mi Home에 등록할 수 있는지 시험(된다면 go2rtc xiaomi 소스) → ② 안 되면 SmartThings 경로 유지 또는 공식 ONVIF 모델(EC6 Dual)이나 go2rtc 확인 모델로 교체 → ③ 해킹 펌웨어는 최후 수단.

### Gaps
- IMILAB이 Tuya 등 다른 클라우드 API를 쓴다는 출처는 찾지 못했다(모두 Xiaomi MIoT 또는 SmartThings 기반으로 보인다).
- clien, 뽐뿌, 네이버 카페의 관련 글은 이번 검색 범위에서 발견되지 않았다(로그인이 필요한 카페 글은 검색 도구로 접근할 수 없음).
- IPC019D 펌웨어 버전과 서명 정보가 없다.
