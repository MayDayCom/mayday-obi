import './installer-theme-public-r4.js';
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
const english = document.documentElement.lang === 'en';
const t = (ko, en) => english ? en : ko;
const manifestURL = new URL('../firmware/manifest.json', import.meta.url);

const checkDeviceButton = document.querySelector('#firmware-check-device');
const deviceVersionMessage = document.querySelector('#firmware-device-version');
let manifestVersion = '';
let deviceVersionChecked = false;
function sayDevice(text) {
  deviceVersionMessage.textContent = text;
}
async function readDeviceVersion() {
  let port;
  let reader;
  let writer;
  try {
    port = await navigator.serial.requestPort();
    await port.open({baudRate: 115200});
    writer = port.writable.getWriter();
    await writer.write(new TextEncoder().encode('MAYDAY_VERSION?\n'));
    writer.releaseLock();
    writer = null;
    reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    const deadline = Date.now() + 3500;
    while (Date.now() < deadline) {
      let timer;
      const next = await Promise.race([
        reader.read(),
        new Promise(resolve => { timer = setTimeout(() => resolve({timedOut: true}), deadline - Date.now()); })
      ]);
      clearTimeout(timer);
      if (next.timedOut || next.done) break;
      buffered += decoder.decode(next.value, {stream: true});
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() || '';
      const line = lines.find(item => item.startsWith('MAYDAY_VERSION|'));
      if (line) {
        const match = line.match(/^MAYDAY_VERSION\|APP=([^|]+)\|FW=(.+)$/);
        if (!match) throw new Error('invalid_response');
        return {app: match[1].trim(), build: match[2].trim()};
      }
    }
    throw new Error('no_response');
  } finally {
    if (reader) {
      try { await reader.cancel(); } catch {}
      reader.releaseLock();
    }
    if (writer) writer.releaseLock();
    if (port?.readable || port?.writable) {
      try { await port.close(); } catch {}
    }
  }
}
checkDeviceButton.addEventListener('click', async () => {
  checkDeviceButton.disabled = true;
  deviceVersionChecked = false;
  sayDevice(t('USB 포트를 선택해 주세요.', 'Select the board’s USB port.'));
  try {
    const device = await readDeviceVersion();
    deviceVersionChecked = true;
    const normalizeVersion = value => value.trim().toLowerCase().replace(/^v\./, 'v');
    const same = normalizeVersion(device.app) === normalizeVersion(manifestVersion);
    sayDevice(same
      ? t(`기기 ${device.app} · 웹 ${manifestVersion} — 같은 버전입니다.`, `Device ${device.app} · Website ${manifestVersion} — versions match.`)
      : t(`기기 ${device.app} · 웹 ${manifestVersion} — 버전이 다릅니다. 설치 전 확인해 주세요.`, `Device ${device.app} · Website ${manifestVersion} — versions differ. Check before installing.`));
  } catch (error) {
    const cancelled = error?.name === 'NotFoundError';
    deviceVersionChecked = !cancelled && error?.message === 'no_response';
    sayDevice(cancelled
      ? t('USB 포트 선택을 취소했습니다.', 'USB port selection was cancelled.')
      : error?.message === 'no_response'
        ? t('기기에서 버전 응답이 없습니다. 현재 펌웨어가 조회를 지원하지 않을 수 있습니다. 설치 확인 절차를 거쳐 계속할 수 있습니다.', 'The device did not return a version. Its firmware may not support this check. You can continue after the installation confirmation.')
        : t('USB 연결을 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.', 'Could not read the USB connection. Check the connection and try again.'));
  } finally {
    checkDeviceButton.disabled = !ready;
    installButton.disabled = !ready || !confirmation.checked || !deviceVersionChecked;
  }
});
function say(label, detail) {
  status.textContent = label;
  message.textContent = detail;
}
confirmation.addEventListener('change', () => {
  installButton.disabled = !ready || !confirmation.checked || !deviceVersionChecked;
});
async function checkRelease() {
  if (checking) return;
  checking = true;
  ready = false;
  deviceVersionChecked = false;
  checkDeviceButton.disabled = true;
  installer.hidden = true;
  download.hidden = true;
  placeholder.hidden = false;
  installButton.disabled = true;
  retry.hidden = true;
  say(t('배포 파일 확인 중', 'Checking firmware'), t('잠시만 기다려 주세요.', 'Please wait while we check the release.'));
  let timer;
  const controller = new AbortController();
  timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(manifestURL, {cache: 'no-store', signal: controller.signal});
    if (!response.ok) throw new Error('manifest');
    const manifest = await response.json();
    manifestVersion = manifest.version || document.querySelector('.release-version')?.textContent.trim() || '';
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
      say(t('펌웨어 준비 중', 'Firmware unavailable'), t('펌웨어를 준비하고 있습니다. 공개 후 이곳에서 설치할 수 있습니다.', 'The firmware file is not available yet. Please check back later.'));
      return;
    }
    if (!binary.ok) throw new Error('network');
    const header = new Uint8Array(await binary.arrayBuffer());
    // This board's factory layout: bootloader 0, partition table 0x8000, app 0x10000.
    // An ESP32-S3 app also starts with E9/chip 9, so chip detection alone is insufficient.
    if (header.length >= 36 && header[32] === 0x32 && header[33] === 0x54 &&
        header[34] === 0xcd && header[35] === 0xab) {
      say(t('설치 파일 수정 중', 'Firmware update in progress'), t('설치 파일을 점검하고 있습니다. 잠시 후 다시 확인해 주세요.', 'The firmware file is being updated. Please try again shortly.'));
      return;
    }
    const validBoot = header[0] === 0xe9 && header[12] === 9 && header[13] === 0;
    const validPartitions = header[0x8000] === 0xaa && header[0x8001] === 0x50;
    const validApp = header[0x10000] === 0xe9 && header[0x1000c] === 9 &&
      header[0x1000d] === 0 && header[0x10020] === 0x32 &&
      header[0x10021] === 0x54 && header[0x10022] === 0xcd && header[0x10023] === 0xab;
    if (header.length < 0x10024 || !validBoot || !validPartitions || !validApp) {
      say(t('설치 파일 점검 중', 'Checking firmware image'), t('설치 파일을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not verify the firmware image. Please try again shortly.'));
      return;
    }
    download.href = binaryURL.href;
    download.hidden = false;
    if (!window.isSecureContext || !('serial' in navigator)) {
      say(t('PC 브라우저에서 설치', 'Use a desktop browser'), t('USB 설치는 PC의 Chrome 또는 Edge에서 이 페이지를 열어 진행해 주세요. 펌웨어 파일은 아래에서 받을 수 있습니다.', 'For USB installation, open this page in Chrome or Edge on a computer. You can download the firmware below.'));
      return;
    }
    say(t('USB 설치 준비 중', 'Preparing USB install'), t('설치 도구를 불러오고 있습니다.', 'Loading the installer.'));
    clearTimeout(timer);
    await Promise.race([
      import('https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-button.js?module'),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('library')), 15000); })
    ]);
    installer.setAttribute('manifest', manifestURL.href);
    ready = true;
    checkDeviceButton.disabled = !('serial' in navigator);
    installButton.disabled = !confirmation.checked || !deviceVersionChecked;
    if (!('serial' in navigator)) {
      sayDevice(t('기기 버전 확인은 PC Chrome 또는 Edge에서 사용할 수 있습니다.', 'Device version check requires desktop Chrome or Edge.'));
    }
    installer.hidden = false;
    placeholder.hidden = true;
    say(t('USB 설치 가능', 'Ready to install'), t('보드를 연결하고 아래 확인 항목을 체크한 뒤 설치 버튼을 눌러 주세요.', 'Connect the board, confirm the safety checklist, then select Install.'));
  } catch (error) {
    say(t('설치 준비를 확인하지 못했습니다', 'Could not prepare installer'), t('인터넷 연결을 확인하고 다시 시도해 주세요. 계속되면 배포 파일을 점검해야 합니다.', 'Check your internet connection and try again. If the problem continues, the firmware release may need attention.'));
  } finally {
    clearTimeout(timer);
    checking = false;
    retry.hidden = false;
    placeholder.hidden = ready;
  }
}
retry.addEventListener('click', checkRelease);
checkRelease();
