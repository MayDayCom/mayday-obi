import './installer-theme-public-r4.js?v=20261103-fixed-progress';
import { installVersionDialogIntegration } from './installer-version-dialog.js?v=20261103-fixed-progress';
import { readFirmwareRelease } from './firmware-release.js?v=20261102-auto-release';
const status = document.querySelector('#firmware-status');
const message = document.querySelector('#firmware-message');
const placeholder = document.querySelector('#firmware-pending');
const installer = document.querySelector('#usb-installer');
const download = document.querySelector('#firmware-download');
const appDownload = document.querySelector('#firmware-app-download');
const fileNote = document.querySelector('#firmware-file-note');
const retry = document.querySelector('#firmware-retry');
const confirmation = document.querySelector('#firmware-confirm');
const installButton = document.querySelector('#firmware-install');
const english = document.documentElement.lang === 'en';
const t = (ko, en) => english ? en : ko;
const releaseBase = new URL('../firmware/', import.meta.url);
const legacyManifestURL = new URL('manifest.json', releaseBase);
let checking = false, ready = false;
const objectURLs = [];
function objectURL(bytes, type) {
  const url = URL.createObjectURL(new Blob([bytes], {type}));
  objectURLs.push(url);
  return url;
}
function clearURLs() {
  objectURLs.splice(0).forEach(url => URL.revokeObjectURL(url));
}
window.addEventListener('pagehide', clearURLs);
function say(label, detail) {
  status.textContent = label;
  message.textContent = detail;
}
function showVersion(version) {
  document.querySelectorAll('#firmware .release-version').forEach(node => { node.textContent = version; });
}
confirmation.addEventListener('change', () => {
  installButton.disabled = !ready || !confirmation.checked;
});
async function checkRelease() {
  if (checking || document.querySelector('ewt-install-dialog')) return;
  checking = true;
  ready = false;
  clearURLs();
  installer.hidden = true;
  download.hidden = appDownload.hidden = true;
  placeholder.hidden = false;
  installButton.disabled = true;
  retry.hidden = true;
  showVersion(t('확인 중', 'Checking'));
  fileNote.textContent = '';
  say(t('배포 파일 확인 중', 'Checking firmware'), t('펌웨어 파일에서 버전을 읽고 있습니다.', 'Reading the version from the firmware files.'));
  let timer;
  const controller = new AbortController();
  timer = setTimeout(() => controller.abort(), 30000);
  try {
    // Legacy-only JSON fallback for the historical untagged v1.10c firmware.
    let legacyManifest = {};
    try {
      const response = await fetch(legacyManifestURL, {cache: 'no-store', signal: controller.signal});
      if (response.ok) legacyManifest = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
    }
    const release = await readFirmwareRelease(releaseBase, legacyManifest, controller.signal);
    showVersion(release.version);
    const factoryURL = objectURL(release.factoryBytes, 'application/octet-stream');
    download.href = factoryURL;
    download.hidden = false;
    if (release.appBytes) {
      appDownload.href = objectURL(release.appBytes, 'application/octet-stream');
      appDownload.hidden = false;
      fileNote.textContent = t(
        '업데이트 파일은 기기의 펌웨어 업데이트 기능에서 사용합니다. USB 업데이트 지원 기기는 일반 파일을 반대편 파티션에 저장합니다. 최초 설치·복구에는 통합 파일을 사용합니다.',
        'Use the update file in the device’s firmware updater. Supported devices save the app image to the inactive partition over USB. Factory/recovery installation uses the combined image.');
    } else {
      fileNote.textContent = t(
        '현재 배포본은 최초 설치·복구 파일만 제공됩니다.',
        'The current release provides only a factory/recovery image.');
    }
    if (!window.isSecureContext || !('serial' in navigator)) {
      say(t('PC 브라우저에서 설치', 'Use a desktop browser'), t('USB 설치는 PC Chrome 또는 Edge에서 진행해 주세요. 파일은 아래에서 받을 수 있습니다.', 'Use desktop Chrome or Edge for USB installation. Firmware downloads are available below.'));
      return;
    }
    const manifest = {
      name: 'MAYDAY OBI', version: release.version,
      new_install_prompt_erase: true, new_install_improv_wait_time: 0,
      builds: [{chipFamily: 'ESP32-S3', parts: [{path: factoryURL, offset: 0}]}]
    };
    const manifestURL = new URL(objectURL(JSON.stringify(manifest), 'application/json'));
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), 20000);
    await Promise.race([
      (async () => {
        await import('https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-button.js?module');
        await installVersionDialogIntegration(manifestURL, release);
      })(),
      new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('library')), {once: true}))
    ]);
    installer.manifest = manifestURL.href;
    installer.setAttribute('manifest', manifestURL.href);
    ready = true;
    installButton.disabled = !confirmation.checked;
    installer.hidden = false;
    placeholder.hidden = true;
    say(t('USB 설치 가능', 'Ready to install'), t('USB 설치를 누르면 연결된 기기와 설치할 버전을 비교합니다.', 'Select USB Install to compare the connected device and release versions.'));
  } catch (error) {
    showVersion(t('확인 필요', 'Unavailable'));
    const pair = ['release_pair', 'invalid_image', 'invalid_metadata', 'missing_factory'].includes(error.message);
    say(pair ? t('배포 파일 확인 필요', 'Check release files') : t('설치 준비를 확인하지 못했습니다', 'Could not prepare installer'),
      pair
        ? t('같은 빌드의 업데이트 파일과 최초 설치·복구 파일을 확인하고 있습니다. 잠시 후 다시 확인해 주세요.', 'Checking the update and factory/recovery files from the same build. Please try again shortly.')
        : t('인터넷 연결을 확인하고 다시 시도해 주세요.', 'Check your connection and try again.'));
  } finally {
    clearTimeout(timer);
    checking = false;
    retry.hidden = false;
    placeholder.hidden = ready;
  }
}
retry.addEventListener('click', checkRelease);
checkRelease();
