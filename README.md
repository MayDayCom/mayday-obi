# MAYDAY OBI · Firmware Center (Outline)

**마끼다 LXT 배터리 전용** ESP32-S3 + 3.5인치 터치스크린 기반 **MAYDAY OBI** 프로젝트를 소개하고 추후 펌웨어를 배포하기 위한 **GitHub Pages 홈페이지 초안**입니다.

> **현재 상태: 디자인/구조 프리뷰.** 펌웨어 BIN·매니페스트·웹 플래싱은 연결하지 않았습니다. 이 저장소의 초안은 설치를 수행하지 않습니다.

## 지원 대상

- **배터리 플랫폼:** Makita LXT 시리즈 전용 (모델별 BMS 호환성은 검증 후 공개)
- **지원하지 않는 대상:** 다른 브랜드 배터리, 마끼다 XGT·CXT 등 다른 배터리 플랫폼
- **하드웨어:** 특정 ESP32-S3 3.5인치 터치스크린 보드 기반이며 정확한 보드 모델 정보는 검증 후 공지
- 보호회로 오류 해제 가능 여부 및 안전성은 모델과 배터리 상태에 따라 달라집니다.

## 시작하기

- `index.html` : 한국어 홈페이지 (프로젝트 소개 / 배포센터 / 지원 보드 / 설치 안내)
- `styles.css` : 반응형 스타일
- `docs/ROADMAP.md` : 공개 전 검증 항목
- `firmware/README.md` : 추후 바이너리 등록 위치 안내
- `.nojekyll` : GitHub Pages 정적 파일 제공

외부 빌드 시스템 없이 `index.html`을 브라우저에서 열어 전체 레이아웃을 확인할 수 있습니다. 웹폰트는 인터넷 연결 시 적용됩니다.

## GitHub Pages 배포

1. 이미 생성된 `MayDayCom/mayday-obi` **공개** 저장소를 사용합니다.
2. 이 패키지의 파일과 폴더를 저장소 **최상위(root)** 에 올립니다.
3. 저장소의 **Settings → Pages → Build and deployment → Deploy from a branch** 를 선택합니다.
4. 브랜치는 `main`, 폴더는 `/(root)`로 지정하고 저장합니다.
5. 배포 성공 후 주소: `https://maydaycom.github.io/mayday-obi/` (사이트 게시 전에는 열리지 않음)

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