# MAYDAY OBI USB 웹 설치 배포

웹 설치는 ESP Web Tools를 사용합니다. **펌웨어 파일이 이미 GitHub에 배포되어 있습니다.** 현재 `manifest.json`에 표시된 버전은 **v1.10c**입니다.

## 배포 파일
- `firmware.bin` — 현재 등록된 펌웨어 파일
- `firmware.factory.bin` — 현재 등록된 팩토리 이미지
- `manifest.json` — 웹 설치에서 사용하는 파일 경로 및 배포 버전 정보
- 설치: [MAYDAY OBI 홈페이지](https://maydaycom.github.io/mayday-obi/#firmware)

PC Chrome/Edge에서 홈페이지를 열고 안내에 따라 USB로 설치할 수 있습니다. 새 파일을 배포할 때는 실제 바이너리 구성과 `manifest.json`의 버전·경로가 일치하도록 관리하세요.

## 반드시 맞춰야 할 바이너리 형식
- 홈페이지에 안내된 ESP32-S3 3.5인치 보드용 빌드여야 합니다.
- **플래시 주소 0x0에 쓰는 통합 이미지**여야 합니다. 부트로더, 파티션 테이블, 앱 및 필요한 초기화 데이터를 실제 빌드의 주소에 맞춰 병합해야 합니다.
- PlatformIO 등의 일반 앱 단독 firmware.bin을 이름만 바꿔 올리면 안 됩니다.
- 병합은 실제 빌드의 플래시 크기·모드·주파수와 주소를 기준으로 수행하세요. 다른 보드의 설정을 복사하지 마세요.
- 홈페이지의 헤더 검사는 파일 누락·HTML 응답·명백한 다른 칩 이미지를 걸러내는 보조 확인입니다. 통합 여부, 실제 보드의 화면/터치/PSRAM/핀맵 호환성과 동작은 보장하지 않습니다.
- ESP Web Tools의 칩 식별은 ESP32-S3 계열을 구별할 뿐, 같은 칩을 쓴 다른 보드 모델은 구별하지 못합니다.

## 버전 관리
현재 [`manifest.json`](manifest.json)의 `version`은 **v1.10c**입니다. **실제 최신 버전은 이 파일에서 확인**하세요. README의 버전 표기는 자동 갱신되지 않습니다. 웹 설치용 바이너리 경로는 manifest 기준 `firmware.bin`, offset은 `0`입니다. 다른 배포 형식을 사용할 경우 설치 스크립트의 검증 조건도 함께 수정해야 합니다.
기존 설정 삭제는 설치 대화상자에서 사용자가 선택합니다. "지우지 않음"이 모든 버전 간 설정 보존을 보장하지는 않습니다.

## 배포 확인
- PC Chrome/Edge에서 HTTPS 홈페이지 열기 → 파일 확인 → 보드 확인 체크 → 설치 버튼 → 포트 선택 → 설치 완료 → 재부팅.
- 실제 대상 보드로 화면, 터치, 버전 표시, USB 재연결과 실패 복구를 확인한 뒤 배포하세요.
- GitHub에 펌웨어 바이너리가 등록되어 있습니다. 이 문서는 실제 하드웨어에서의 설치 성공 여부를 증명하지 않습니다.
- 펌웨어가 없거나 잘못된 헤더이면 설치 버튼은 비활성화됩니다. 네트워크 오류·도구 로딩 실패 시 다시 확인할 수 있습니다.
- 배포 파일을 받을 수 있으면 Web Serial 미지원 환경에도 다운로드 링크는 제공됩니다.
- 외부 의존성: https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module
- 공식 문서: https://esphome.github.io/esp-web-tools/

## 지원 및 출처
마끼다 LXT 전용입니다. XGT·CXT 및 타사 플랫폼은 지원 대상이 아닙니다.
Open Battery Information — Martin Jansson, MIT License, Copyright (c) 2024 Martin Jansson.
원본: https://github.com/mnh-jansson/open-battery-information
배포하는 실제 코드와 라이브러리의 라이선스 고지를 함께 유지하세요.
