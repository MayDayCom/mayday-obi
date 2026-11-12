# USB 설치 집계 자동 갱신

MAYDAY OBI GA4 속성(563886388)에서 `firmware_install_success` 이벤트 수를 읽어 홈페이지의 설치 건수를 갱신합니다. 공개 JSON에는 누적 건수와 집계 시작일만 저장합니다.

- Google Cloud의 `mayday-obi-analytics` 프로젝트에서 Google Analytics Data API를 사용합니다.
- [Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)은 이 저장소의 `main` 브랜치에 있는 `firmware-install-count.yml`에만 인증을 허용합니다. GA4 서비스 계정에는 MAYDAY OBI 속성의 **뷰어** 권한을 부여했습니다.
- 워크플로는 매시간 03분부터 58분까지 5분 간격으로 예약됩니다. GitHub 실행 대기와 GA4 보고서 처리 시간에 따라 홈페이지 반영 시점은 달라질 수 있습니다. 수동 조회는 **Actions → Refresh USB install count → Run workflow**에서 실행할 수 있습니다.
- 조회에 실패하면 마지막 집계 값을 유지합니다. GitHub Pages 배포를 기다리지 않고 공개 저장소의 집계 JSON을 읽습니다.
