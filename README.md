# MAYDAY OBI · Firmware Center

**마끼다 LXT 배터리 전용** ESP32-S3 + 3.5인치 터치스크린 기반 **MAYDAY OBI** 프로젝트를 소개하고 추후 펌웨어를 배포하기 위한 **GitHub Pages 홈페이지**입니다.

> **현재 상태: 기기에서 MAYDAY OBI 실행 확인 · 펌웨어 공개 준비 중.** 실제 구동 사진을 홈페이지에 표시하고 있습니다. 일반 배포용 BIN·매니페스트·웹 플래싱은 아직 연결하지 않았습니다.

## 지원 대상

- **배터리 플랫폼:** Makita LXT 시리즈 전용 (모델별 BMS 호환성은 검증 후 공개)
- **지원하지 않는 대상:** 다른 브랜드 배터리, 마끼다 XGT·CXT 등 다른 배터리 플랫폼
- **하드웨어:** 특정 ESP32-S3 3.5인치 터치스크린 보드 기반이며 정확한 보드 모델 정보는 검증 후 공지
- 보호회로 오류 해제 가능 여부 및 안전성은 모델과 배터리 상태에 따라 달라집니다.

## 원본 OBI 기준 BMS 지원 목록 (참고)

출처: [Martin Jansson / Open Battery Information의 Makita LXT Wiki](https://github.com/mnh-jansson/open-battery-information/wiki/Makita) (2026-07-12 편집 기준). **아래 정보는 원본 OBI의 호환성 정보이며 MAYDAY OBI 3.5인치 펌웨어의 자체 검증 완료 목록이 아닙니다.**

| 원본 OBI 판정 | BMS 기판 | MCU |
|---|---|---|
| 지원 | LIPW014, LIPW015 | MAK02 |
| 지원 | LIPW017 | STM32L051C8 |
| 지원 | BL1850B-D, BL1850B, BL1840B | RL78 / RAJ240080DFP |
| 지원 | BL1815N / BL1820 기판 | MAK01 |
| 미지원 | LIP5002, LIPW001 | MC908JK3E |
| 미지원 | LIPW002, 003, 005, 006, 011, 012, 013 | uPD78F0513 |
| 미지원 | 일부 구형 BL1820 미표기 기판 | uPD78F0513 |

배터리 외부 모델 번호만으로 BMS 지원 여부를 판정할 수 없습니다. 같은 배터리 모델이라도 서로 다른 BMS가 탑재될 수 있고, 진단 지원과 오류 해제 지원은 다를 수 있습니다. **LIPW017은 충전 후 재잠금 등 원본 문서상 특이사항이 있으므로 원본 Wiki 경고를 참고하세요.**

KST 제작 페이지(https://ai.kenhsangtao.com/makita/)는 참조 링크로만 표기했습니다. 현재 이 페이지의 구체적인 지원 BMS 목록은 신뢰할 만큼 확인되지 않아 가져오지 않았습니다.

## 실제 장치 및 부품 사진

- `assets/mayday-obi-running.jpg` — 사용자가 직접 촬영한 **실제 MAYDAY OBI v1.0d 실행 사진** (원본 JPG를 변환하거나 재생성하지 않고 그대로 등록)
- `assets/esp32-s3-3.5-front.jpg` — ESP32-S3 3.5인치 보드 전면 제품 사진 (제조사 기본 데모 UI)
- `assets/esp32-s3-3.5-back.jpg` — ESP32-S3 3.5인치 보드 후면 단자 표기 제품 사진
- `assets/batterist-mayday-logo.jpg` — 배터리스트 메이데이 원본 로고 (웹페이지에서 CSS로 원형 표시)

실제 구동 사진에는 Wi-Fi 연결 성공이 표시되어 있지만, 배터리 상세 정보는 아직 읽지 않은 상태입니다. 이를 BMS 호환성 또는 오류 해제 검증 완료의 증거로 해석하지 않습니다.

제품 사진의 기본 메뉴는 MAYDAY OBI 실행 화면이 아니며, 후면 단자 표기는 정확한 GPIO 배선도나 전기적 사양을 보증하지 않습니다.

## 시작하기

- `index.html` : 한국어 반응형 홈페이지 (실제 구동 사진 / 프로젝트 소개 / 배포센터 / 제작 보드 / 원본 BMS 참고표 / 설치 안내)
- `styles.css` : 반응형 스타일
- `docs/ROADMAP.md` : 공개 전 검증 항목
- `firmware/README.md` : 추후 바이너리 등록 위치 안내
- `.nojekyll` : GitHub Pages 정적 파일 제공

외부 빌드 시스템 없이 `index.html`을 브라우저에서 열어 전체 레이아웃을 확인할 수 있습니다. 웹폰트는 인터넷 연결 시 적용됩니다.

## GitHub Pages 배포

1. 저장소 [MayDayCom/mayday-obi](https://github.com/MayDayCom/mayday-obi)를 엽니다.
2. **Settings → Pages → Build and deployment**에서 `Deploy from a branch`를 선택합니다.
3. 브랜치는 `main`, 폴더는 `/(root)`를 지정합니다.
4. 공개 페이지: https://maydaycom.github.io/mayday-obi/

## 실제 설치 기능을 붙이기 전 필수 작업

- 정확한 보드 모델명, 디스플레이 컨트롤러, 터치 칩, PSRAM/Flash 크기, 핀 매핑 확인
- ESP32-S3용 **동작 검증된** 플래시 이미지 및 파티션/부트로더 구성 검증
- 정확한 주소와 오프셋을 가진 ESP Web Tools용 `manifest.json` 작성
- 기존 펌웨어 백업·복구 절차, 테스트 영상, 지원 보드 사진 준비
- 원본 개발자 Martin Jansson과 Open Battery Information의 MIT 라이선스 고지 유지, 향후 펌웨어에 포함된 기타 라이브러리·코드의 라이선스 확인
- 배터리 진단/오류 해제가 안전한 셀 상태를 보증하지 않는다는 주의사항 게시

## 실제 제작에 사용한 보드

- ESP32-S3 3.5인치 보드 구매 링크 (제작자 제공): https://s.click.aliexpress.com/e/_c4naCAr1
- 판매 상품·옵션은 바뀔 수 있으며 정확한 보드 모델, 디스플레이/터치 컨트롤러와 핀 배치를 확인해야 합니다. 모든 3.5인치 ESP32-S3 보드가 호환되지는 않습니다.

## 원본 프로젝트와 저작권 표시

MAYDAY OBI는 **Martin Jansson**이 시작한 **Open Battery Information (OBI)** 프로젝트의 연구·기술적 성과에서 비롯된 ESP32-S3 3.5인치 터치스크린 구현입니다.

- 원본 개발자: **Martin Jansson**
- 원본 저장소: https://github.com/mnh-jansson/open-battery-information
- 원본 라이선스: **MIT License** (https://github.com/mnh-jansson/open-battery-information/blob/main/LICENSE.md)
- 원본 저작권: **Copyright (c) 2024 Martin Jansson**

원본 저작물의 코드가 포함되는 펌웨어를 배포할 때에는 해당 라이선스의 저작권·허가 고지를 유지해야 합니다. 본 저장소의 현재 웹페이지와 향후 MAYDAY OBI 코드의 라이선스는 별도로 정해야 하며, 원본 프로젝트의 MIT 라이선스가 이 저장소 전체에 자동 적용되는 것은 아닙니다.

원본의 공개 기여에 감사드립니다. 본 사이트는 Martin Jansson 또는 Makita가 운영·승인하는 공식 사이트가 아닙니다.

- YouTube: https://www.youtube.com/@batterist_mayday
- GitHub: https://github.com/MayDayCom
- ESP Web Tools: https://github.com/esphome/esp-web-tools

## 저작권·라이선스

현재 웹 초안 소스의 공개 범위 및 라이선스는 **결정 전**입니다. 펌웨어 코드의 출처와 라이선스 검토 후 명확히 지정하세요.