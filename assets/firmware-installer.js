import './installer-theme.js?v=20261029-ko-recovery';
// The release contract is a merged ESP32-S3 image starting at flash address 0.
const status = document.querySelector('#firmware-status');
const message = document.querySelector('#firmware-message');
const placeholder = document.querySelector('#firmware-pending');
const installer = document.querySelector('#usb-installer');
const download = document.querySelector('#firmware-download');
const retry = document.querySelector('#firmware-retry');
const confirmation = document.querySelector('#firmware-confirm');
const installButton = document.querySelector('#firmware-install');
let checking = false;
let ready = false;
const manifestURL = new URL('../firmware/manifest.json', import.meta.url);
function say(label, detail) {
  status.textContent = label;
  message.textContent = detail;
}
confirmation.addEventListener('change', () => {
  installButton.disabled = !ready || !confirmation.checked;
});
async function checkRelease() {
  if (checking) return;
  checking = true;
  ready = false;
  installer.hidden = true;
  download.hidden = true;
  placeholder.hidden = false;
  installButton.disabled = true;
  retry.hidden = true;
  say('배포 파일 확인 중', '잠시만 기다려 주세요.');
  let timer;
  const controller = new AbortController();
  timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(manifestURL, {cache: 'no-store', signal: controller.signal});
    if (!response.ok) throw new Error('manifest');
    const manifest = await response.json();
    const build = manifest.builds?.find(item => item.chipFamily === 'ESP32-S3');
    if (!manifest.name || !manifest.version || build?.parts?.length !== 1 ||
        build.parts[0].offset !== 0 || build.parts[0].path !== 'firmware.bin') {
      throw new Error('manifest');
    }
    const binaryURL = new URL(build.parts[0].path, manifestURL);
    const binary = await fetch(binaryURL, {
      cache: 'no-store', headers: {Range: 'bytes=0-65571'}, signal: controller.signal
    });
    if (binary.status === 404) {
      say('펌웨어 업로드 대기', '웹 설치 기능이 준비되었습니다. 펌웨어 파일이 등록되면 설치할 수 있습니다.');
      return;
    }
    if (!binary.ok) throw new Error('network');
    const header = new Uint8Array(await binary.arrayBuffer());
    // This board's factory layout: bootloader 0, partition table 0x8000, app 0x10000.
    // An ESP32-S3 app also starts with E9/chip 9, so chip detection alone is insufficient.
    if (header.length >= 36 && header[32] === 0x32 && header[33] === 0x54 &&
        header[34] === 0xcd && header[35] === 0xab) {
      say('설치 파일 수정 중', '앱 단독 파일이 등록되어 USB 설치를 중단했습니다. 통합 펌웨어가 등록된 뒤 다시 확인해 주세요.');
      return;
    }
    const validBoot = header[0] === 0xe9 && header[12] === 9 && header[13] === 0;
    const validPartitions = header[0x8000] === 0xaa && header[0x8001] === 0x50;
    const validApp = header[0x10000] === 0xe9 && header[0x1000c] === 9 &&
      header[0x1000d] === 0 && header[0x10020] === 0x32 &&
      header[0x10021] === 0x54 && header[0x10022] === 0xcd && header[0x10023] === 0xab;
    if (header.length < 0x10024 || !validBoot || !validPartitions || !validApp) {
      say('설치 파일 점검 중', '이 보드용 통합 펌웨어 구성을 확인하지 못해 설치를 중단했습니다.');
      return;
    }
    download.href = binaryURL.href;
    download.hidden = false;
    if (!window.isSecureContext || !('serial' in navigator)) {
      say('PC 브라우저에서 설치', 'USB 설치는 PC의 Chrome 또는 Edge에서 이 페이지를 열어 진행해 주세요. 펌웨어 파일은 아래에서 받을 수 있습니다.');
      return;
    }
    say('USB 설치 준비 중', '설치 도구를 불러오고 있습니다.');
    clearTimeout(timer);
    await Promise.race([
      import('https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-button.js?module'),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('library')), 15000); })
    ]);
    installer.setAttribute('manifest', manifestURL.href);
    ready = true;
    installButton.disabled = !confirmation.checked;
    installer.hidden = false;
    placeholder.hidden = true;
    say('USB 설치 가능', '보드를 연결하고 아래 확인 항목을 체크한 뒤 설치 버튼을 눌러 주세요.');
  } catch (error) {
    say('설치 준비를 확인하지 못했습니다', '인터넷 연결을 확인하고 다시 시도해 주세요. 계속되면 배포 파일을 점검해야 합니다.');
  } finally {
    clearTimeout(timer);
    checking = false;
    retry.hidden = false;
    placeholder.hidden = ready;
  }
}
retry.addEventListener('click', checkRelease);
checkRelease();
