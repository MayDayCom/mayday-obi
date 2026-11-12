# USB 설치 집계

공개 홈페이지에서 USB 최초 설치·복구 또는 업데이트가 완료되면 Cloudflare Worker에 설치 완료 요청을 보냅니다. Worker는 D1에 설치 유형과 임의의 요청 ID를 저장합니다. 같은 요청 ID로 재시도해도 건수는 한 번만 올라갑니다.

- 시작일은 첫 설치 기록이 들어온 날짜를 한국 시간으로 저장합니다. 같은 기기에 다시 설치하면 별도 건으로 집계합니다.
- 공개 조회 응답에는 누적 건수와 시작일만 포함됩니다. 이 수치는 홈페이지가 받은 설치 완료 보고를 기준으로 합니다.
- Worker 코드와 D1 스키마는 [workers/install-counter](../workers/install-counter/)에 있습니다. Worker에는 D1 바인딩 `INSTALL_COUNTS`와 요청 제한 바인딩 `INSTALL_RATE_LIMIT`를 설정합니다.
