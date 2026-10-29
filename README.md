# MAYDAY OBI

**마끼다 LXT 배터리 진단용 ESP32-S3 3.5인치 터치스크린 프로젝트**

**[MAYDAY OBI 홈페이지 바로가기](https://maydaycom.github.io/mayday-obi/)** · [배터리스트 메이데이 YouTube](https://www.youtube.com/@batterist_mayday)

![ESP32-S3에서 실행 중인 MAYDAY OBI v1.0d](assets/mayday-obi-running.jpg)

## 펌웨어 상태

**배포 준비 중** — 다운로드 파일과 웹 설치 기능은 아직 공개되지 않았습니다.

## 사용 보드와 연결

- ESP32-S3 3.5인치 터치스크린 보드
- **P2 (8핀):** IO5 → DATA, IO6 → ENABLE
- **P3 (4핀):** GND → 배터리 B−, 3.3V → 4.7kΩ 저항 → DATA
- **18V B+를 ESP32에 직접 연결하지 마세요.**

[실제 보드 후면 사진](assets/esp32-s3-3.5-back.jpg) · [배선도](https://maydaycom.github.io/mayday-obi/#wiring) · [사용 보드 구매처](https://s.click.aliexpress.com/e/_c4naCAr1)

연결 전에 사용 중인 보드의 핀 방향과 펌웨어 설정을 확인하세요.

## BMS 지원 참고

마끼다 **LXT 전용**입니다. 지원 기판 목록은 [원본 OBI의 Makita Wiki](https://github.com/mnh-jansson/open-battery-information/wiki/Makita)를 참고하세요. 해당 목록은 **MAYDAY OBI 펌웨어 자체의 호환성 검증 결과가 아닙니다.**

## 자료 출처

MAYDAY OBI는 **Martin Jansson**의 [Open Battery Information](https://github.com/mnh-jansson/open-battery-information)을 바탕으로 제작한 비공식 프로젝트입니다.

원본 OBI: [MIT License](https://github.com/mnh-jansson/open-battery-information/blob/main/LICENSE.md) · Copyright (c) 2024 Martin Jansson.

참고: [KST Makita 프로젝트](https://ai.kenhsangtao.com/makita/). 본 프로젝트는 Makita의 공식 제품이나 후원 프로젝트가 아닙니다.
