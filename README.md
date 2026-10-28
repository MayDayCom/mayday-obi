# MAYDAY OBI · Firmware Center (Outline)

ESP32-S3 + 3.5인치 터치스크린 기반 **MAYDAY OBI** 프로젝트를 소개하고 추후 펌웨어를 배포하기 위한 **GitHub Pages 홈페이지 초안**입니다.

> **현재 상태: 디자인/구조 프리뷰.** 펌웨어 BIN·매니페스트·웹 플래싱은 연결하지 않았습니다. 이 저장소의 초안은 설치를 수행하지 않습니다.

## 시작하기

- `index.html` : 한국어 홈페이지 (프로젝트 소개 / 배포센터 / 지원 보드 / 설치 안내)
- `styles.css` : 반응형 스타일
- `docs/ROADMAP.md` : 공개 전 검증 항목
- `firmware/README.md` : 추후 바이너리 등록 위치 안내
- `.nojekyll` : GitHub Pages 정적 파일 제공

외부 빌드 시스템 없이 `index.html`을 브라우저에서 열어 전체 레이아웃을 확인할 수 있습니다. 웹폰트는 인터넷 연결 시 적용됩니다.

## GitHub Pages 배포

1. `MayDayCom/mayday-obi`라는 **공개** 저장소를 생성합니다.
2. 이 패키지의 파일과 폴더를 저장소 **최상위(root)** 에 올립니다.
3. 저장소의 **Settings → Pages → Build and deployment → Deploy from a branch** 를 선택합니다.
4. 브랜치는 `main`, 폴더는 `/(root)`로 지정하고 저장합니다.
5. 배포 성공 후 주소: `https://maydaycom.github.io/mayday-obi/` (사이트 게시 전에는 열리지 않음)

## 실제 설치 기능을 붙이기 전 필수 작업

- 정확한 보드 모델명, 디스플레이 컨트롤러, 터치 칩, PSRAM/Flash 크기, 핀 매핑 확인
- ESP32-S3용 **동작 검증된** 플래시 이미지 및 파티션/부트로더 구성 검증
- 정확한 주소와 오프셋을 가진 ESP Web Tools용 `manifest.json` 작성
- 기존 펌웨어 백업·복구 절차, 테스트 영상, 지원 보드 사진 준비
- 원저작물/오픈소스 코드의 출처·라이선스 조건 확인 후 표시
- 배터리 진단/오류 해제가 안전한 셀 상태를 보증하지 않는다는 주의사항 게시

## 출처

본 사이트는 별도 웹사이트 초안이며, 원본 OpenBatteryInformation(OBI) 또는 타 개발자의 펌웨어 배포물이 아닙니다. OBI 관련 코드나 펌웨어를 실제로 배포하기 전 각각의 라이선스를 검토하세요.

- YouTube: https://www.youtube.com/@batterist_mayday
- GitHub: https://github.com/MayDayCom
- ESP Web Tools: https://github.com/esphome/esp-web-tools

## 저작권·라이선스

현재 웹 초안 소스의 공개 범위 및 라이선스는 **결정 전**입니다. 펌웨어 코드의 출처와 라이선스 검토 후 명확히 지정하세요.