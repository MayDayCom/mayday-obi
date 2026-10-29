# MAYDAY OBI

**마끼다 LXT 배터리 진단용 ESP32-S3 3.5인치 터치스크린 프로젝트**

**[MAYDAY OBI 홈페이지 바로가기](https://maydaycom.github.io/mayday-obi/)** · [배터리스트 메이데이 YouTube](https://www.youtube.com/@batterist_mayday)

![ESP32-S3에서 실행 중인 MAYDAY OBI v1.0d](assets/mayday-obi-running.jpg)

## 펌웨어 상태

**배포 준비 중** — 다운로드 파일과 웹 설치 기능은 아직 공개되지 않았습니다.

## 사용 보드와 연결

- ESP32-S3 3.5인치 터치스크린 보드
- **P2:** IO5 → DATA, IO6 → ENABLE
- **P3:** GND → 배터리 B−, 3.3V → 4.7kΩ 저항 → DATA
- **18V B+를 ESP32에 직접 연결하지 마세요.**

[실제 보드 후면 사진](assets/esp32-s3-3.5-back.jpg) · [마끼다 LXT 배선도](https://maydaycom.github.io/mayday-obi/#wiring) · [사용 보드 구매처](https://s.click.aliexpress.com/e/_c4naCAr1)

연결 전에 사용 중인 보드의 핀 방향과 펌웨어 설정을 확인하세요.

## 보드 전원: USB-C 또는 리튬이온 배터리

- **USB-C:** 5V 전원 공급 및 보드 충전회로를 통한 1셀 배터리 충전
- **P5 (JST 1.25mm 2핀):** 보호회로가 있는 1셀(1S) 3.7V 리튬이온/리튬폴리머 배터리
- **전원 2가닥:** 배터리 `+` → **P5 +**, 배터리 `−` → **P5 −**.
- **전압 측정 2가닥:** 배터리 `+` → **R1 100kΩ** → 공통 분압점, 배터리 `−` → **R2 100kΩ** → **같은 공통 분압점**.
- **ADC 연결:** 두 저항이 만나는 분압점에서 **IO9 한 곳에만 연결**합니다. **IO14는 연결하지 않습니다.**
- 현재 `main.cpp`의 `PIN_BAT_ADC = 9`, `BAT_DIV = 2.0` 설정에 맞춘 회로입니다.
- **P5 극성:** USB-C 쪽이 `+`, 반대쪽이 `−`입니다. 실제 기판 극성을 먼저 확인하세요.
- 배터리만 연결했을 때 필요하면 보드의 **Battery switch** 버튼을 누릅니다.
- 2셀 이상 직렬 연결이나 마끼다 LXT 18V를 P5에 직접 연결하지 마세요.

[배터리 전원 및 IO9 전압 측정 연결도](https://maydaycom.github.io/mayday-obi/#battery-power)

## BMS 지원 참고

마끼다 **LXT 전용**입니다. 지원 기판 목록은 [원본 OBI의 Makita Wiki](https://github.com/mnh-jansson/open-battery-information/wiki/Makita)를 참고하세요. 해당 목록은 **MAYDAY OBI 펌웨어 자체의 호환성 검증 결과가 아닙니다.**

## 자료 출처

MAYDAY OBI는 **Martin Jansson**의 [Open Battery Information](https://github.com/mnh-jansson/open-battery-information)을 바탕으로 제작한 비공식 프로젝트입니다.

원본 OBI: [MIT License](https://github.com/mnh-jansson/open-battery-information/blob/main/LICENSE.md) · Copyright (c) 2024 Martin Jansson.

참고: [KST Makita 프로젝트](https://ai.kenhsangtao.com/makita/). 본 프로젝트는 Makita의 공식 제품이나 후원 프로젝트가 아닙니다.
