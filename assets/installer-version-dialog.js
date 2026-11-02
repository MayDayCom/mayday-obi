import { stageUsbFirmware } from './usb-ota-client.js?v=20261102-auto-boot';
const english = document.documentElement.lang === 'en';
const t = (ko, en) => english ? en : ko;

function compareVersions(left, right) {
  const parse = value => {
    const match = String(value).trim().toLowerCase().match(/^v\.?(\d+(?:\.\d+)*)([a-z]*)$/);
    return match ? {numbers: match[1].split('.').map(Number), suffix: match[2]} : null;
  };
  const a = parse(left), b = parse(right);
  if (!a || !b) return null;
  for (let i = 0; i < Math.max(a.numbers.length, b.numbers.length); i++) {
    const difference = (a.numbers[i] || 0) - (b.numbers[i] || 0);
    if (difference) return Math.sign(difference);
  }
  return a.suffix === b.suffix ? 0 : a.suffix > b.suffix ? 1 : -1;
}

// The library owns the already-open port. Release every lock, then reopen the
// same port after the bounded query so its flashing transport has fresh streams.
async function queryVersion(port) {
  let reader, writer, timer;
  try {
    writer = port.writable.getWriter();
    await writer.write(new TextEncoder().encode('MAYDAY_INFO?\nMAYDAY_VERSION?\n'));
    writer.releaseLock();
    writer = null;
    reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    const timeout = new Promise(resolve => { timer = setTimeout(() => resolve({timedOut: true}), 3500); });
    while (true) {
      const next = await Promise.race([reader.read(), timeout]);
      if (next.timedOut || next.done) return null;
      buffered += decoder.decode(next.value, {stream: true});
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('MAYDAY_INFO|')) {
          const info = Object.fromEntries(line.split('|').slice(1).map(part => {
            const index = part.indexOf('=');
            return [part.slice(0, index), part.slice(index + 1)];
          }));
          if (info.APP && info.FW) return {
            app: info.APP, build: info.FW,
            usbOta: info.USB_OTA === '1' && !!info.RUN && !!info.TARGET && info.RUN !== info.TARGET && Number(info.SIZE) > 0,
            running: info.RUN, target: info.TARGET, size: Number(info.SIZE), devicePrompt: info.DEVICE_PROMPT === '1', chunkSize: info.CHUNK ? Number(info.CHUNK) : 128
          };
        }
        const match = line.match(/^MAYDAY_VERSION\|APP=([^|]+)\|FW=(.+)$/);
        if (match) return {app: match[1].trim(), build: match[2].trim()};
      }
      if (buffered.length > 4096) buffered = buffered.slice(-4096);
    }
  } finally {
    clearTimeout(timer);
    if (reader) {
      try { await reader.cancel(); } catch {}
      reader.releaseLock();
    }
    if (writer) writer.releaseLock();
    await port.close();
    await port.open({baudRate: 115200, bufferSize: 8192});
  }
}


function attachUsbUpdate(dialog, card, nativeAction, note, release, device, needsDecision) {
  nativeAction.style.setProperty('display', 'none', 'important');
  const detail = document.createElement('p');
  detail.style.cssText = 'margin:10px 0;color:#626860';
  detail.textContent = t(
    '현재 ' + device.running + ' 파티션을 유지하고 ' + device.target + ' 파티션에 저장합니다. 검증이 완료되면 새 버전으로 자동 재부팅합니다.',
    'Keep ' + device.running + ' running and save to ' + device.target + '. After verification, the device restarts into the new version automatically.');
  card.append(detail);
  const progress = document.createElement('progress');
  progress.max = 100; progress.value = 0; progress.hidden = true;
  progress.style.cssText = 'width:100%;height:14px;margin-top:12px;accent-color:#325e49';
  card.append(progress);
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;margin-top:16px';
  card.append(actions);
  function button(label, handler, primary = false) {
    const node = document.createElement('button');
    node.type = 'button'; node.textContent = label;
    node.style.cssText = 'border:0;border-radius:8px;padding:10px 15px;font:600 14px system-ui;cursor:pointer;background:' +
      (primary ? '#325e49;color:#fffefa' : '#e3ecdf;color:#325e49');
    node.addEventListener('click', handler);
    actions.append(node);
    return node;
  }
  const beforeUnload = event => {
    if (!dialog._maydayUsbBusy) return;
    event.preventDefault(); event.returnValue = '';
  };
  window.addEventListener('beforeunload', beforeUnload);
  dialog.addEventListener('closed', () => window.removeEventListener('beforeunload', beforeUnload), {once: true});
  dialog.shadowRoot.addEventListener('click', event => {
    if (dialog._maydayUsbBusy && event.composedPath().some(node => node.localName === 'ew-icon-button')) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, {capture: true});
  function setBusy(busy) {
    dialog._maydayUsbBusy = busy;
    for (const node of actions.children) {
      node.disabled = busy;
      node.style.opacity = busy ? '0.45' : '1';
      node.style.cursor = busy ? 'wait' : 'pointer';
      node.style.pointerEvents = busy ? 'none' : 'auto';
      node.setAttribute('aria-disabled', busy ? 'true' : 'false');
    }
  }
  button(t('취소', 'Cancel'), () => dialog._closeDialog());
  const start = button(needsDecision ? t('그래도 업데이트 저장', 'Save update anyway') : t('업데이트 저장', 'Save update'), async () => {
    if (dialog._maydayUsbBusy) return;
    setBusy(true);
    start.textContent = t('저장 준비 중…', 'Preparing…');
    progress.hidden = false;
    progress.removeAttribute('value');
    note.textContent = t('저장을 준비하고 있습니다. USB 연결을 유지해 주세요.', 'Preparing the update. Keep USB connected.');
    try {
      const saved = await stageUsbFirmware(dialog.port, release, device, (percent, state = {}) => {
        if (state.phase === 'writing') {
          progress.value = percent;
          start.textContent = t('저장 중 ' + percent + '%', 'Saving ' + percent + '%');
          note.textContent = t('반대편 파티션에 저장 중', 'Saving to inactive partition') +
            ' · ' + (state.sent / 1024).toFixed(1) + ' / ' + (state.total / 1024).toFixed(1) + ' KB';
        } else {
          progress.removeAttribute('value');
          const verifying = state.phase === 'verifying';
          start.textContent = verifying ? t('검증 중…', 'Verifying…') : t('저장 준비 중…', 'Preparing…');
          note.textContent = verifying
            ? t('전송을 마쳤습니다. 기기에서 파일을 검증하고 있습니다.', 'Transfer finished. The device is verifying the image.')
            : t('파일과 저장 공간을 준비하고 있습니다. USB 연결을 유지해 주세요.', 'Preparing the image and storage. Keep USB connected.');
        }
      }, {autoRestart: true});
      if (!saved.rebooting) throw new Error('USB_REBOOT_NOT_CONFIRMED');
      progress.value = 100;
      note.textContent = t('업데이트가 완료되었습니다. 기기가 자동으로 재부팅됩니다.', 'Update complete. The device is restarting automatically.');
      actions.replaceChildren();
      finishInstallDialog(dialog);
    } catch (error) {
      progress.hidden = true;
      console.warn('MAYDAY USB update did not complete:', error);
      const failure = {
        BOOT_ALREADY_PENDING: t('이미 적용 대기 중인 펌웨어가 있습니다. 기기 화면에서 먼저 확인해 주세요.', 'A firmware change is already pending. Check the device screen first.'),
        BUSY: t('다른 업데이트가 진행 중입니다. 완료 후 다시 시도해 주세요.', 'Another update is in progress. Wait for it to finish.'),
        USB_TIMEOUT: t('기기의 전송 응답이 없어 중단했습니다. 기기 화면을 확인하고 20초 후 다시 연결해 주세요.', 'The device stopped acknowledging the transfer. Check the device screen and reconnect after 20 seconds.'),
        HASH_MISMATCH: t('전송된 파일의 검증에 실패했습니다. 새 펌웨어를 적용하지 않았습니다.', 'Transferred file verification failed. The new firmware was not applied.'),
        IMAGE_INVALID: t('기기에서 펌웨어 파일을 검증하지 못했습니다. 올바른 일반 BIN 파일을 확인해 주세요.', 'The device could not validate the image. Check the app-only BIN file.'),
        METADATA_MISMATCH: t('기기와 펌웨어 파일 정보가 맞지 않습니다. 배포 파일을 다시 확인해 주세요.', 'The firmware metadata does not match the device. Check the release files.')
      };
      note.textContent = failure[error.message] || t('업데이트 저장을 확인하지 못했습니다. 기기 화면과 USB 연결을 확인하고 20초 후 다시 연결해 주세요.', 'Could not confirm the saved update. Check the device and USB, then reconnect after 20 seconds.');
      actions.replaceChildren();
      button(t('닫기', 'Close'), () => dialog._closeDialog());
    } finally { setBusy(false); }
  }, true);
}

function observeVersionPanel(dialog) {
  const root = dialog.shadowRoot;
  let observer;
  const refresh = () => {
    if (dialog._state !== 'DASHBOARD' || !dialog._maydayVersionReport || !dialog._manifest) return;
    const content = root.querySelector('div[slot="content"]');
    const action = content?.querySelector('ew-list-item[type="button"]');
    if (!content || !action || content.querySelector('[data-mayday-version-panel]')) return;
    const device = dialog._maydayVersionReport.device;
    const webVersion = dialog._manifest.version;
    const order = device ? compareVersions(device.app, webVersion) : null;
    const needsDecision = order === null || order >= 0;
    const card = document.createElement('section');
    card.dataset.maydayVersionPanel = '';
    card.style.cssText = 'padding:16px;margin-bottom:18px;border:1px solid #d4d7cc;border-radius:12px;background:#f5f3ec;font:14px/1.7 system-ui,sans-serif;color:#292e2b';
    const heading = document.createElement('strong');
    heading.textContent = t('펌웨어 버전', 'Firmware versions');
    card.append(heading);
    for (const [label, value] of [
      [t('설치할 버전', 'Website'), webVersion],
      [t('연결된 기기', 'Connected device'), device?.app || t('확인할 수 없음', 'Unavailable')]
    ]) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:20px;margin-top:8px';
      const name = document.createElement('span'), version = document.createElement('b');
      name.textContent = label;
      version.textContent = value;
      row.append(name, version);
      card.append(row);
    }
    const note = document.createElement('p');
    note.style.cssText = 'margin:14px 0 0;color:#626860';
    note.textContent = !device
      ? t('기기 버전을 읽지 못했습니다. 그래도 설치하시겠습니까?', 'The device version could not be read. Install anyway?')
      : order === 0
        ? t('이미 같은 버전입니다. 다시 설치하시겠습니까?', 'The same version is already installed. Reinstall?')
        : order > 0
          ? t('기기 버전이 더 높습니다. 이전 버전으로 설치하시겠습니까?', 'The device version is newer. Install the older website version?')
          : order === null
            ? t('버전 순서를 확인할 수 없습니다. 그래도 설치하시겠습니까?', 'The version order is unknown. Install anyway?')
            : t('새 버전이 있습니다.', 'A newer version is available.');
    card.append(note);
    const release = dialog._maydayUsbRelease;
    if (device?.usbOta && release?.appBytes) {
      attachUsbUpdate(dialog, card, action, note, release, device, needsDecision);
      content.prepend(card);
      return;
    }

    if (device) {
      // A readable version alone does not authorize a factory overwrite.
      action.style.setProperty('display', 'none', 'important');
      note.textContent = release?.appBytes
        ? t('연결된 기기의 USB 업데이트 기능을 확인하지 못했습니다. 기기에 배포용 펌웨어가 설치되어 있는지 확인해 주세요.', 'USB update support could not be confirmed. Check that the device has the distributed firmware installed.')
        : t('일반 업데이트 파일이 아직 등록되지 않았습니다. 파일 등록 후 다시 확인해 주세요.', 'The app update file is not available yet. Check again after it is published.');
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = t('닫기', 'Close');
      close.style.cssText = 'display:block;margin:16px 0 0 auto;border:0;border-radius:8px;padding:10px 15px;font:600 14px system-ui;background:#e3ecdf;color:#325e49;cursor:pointer';
      close.addEventListener('click', () => dialog._closeDialog());
      card.append(close);
      content.prepend(card);
      return;
    }
    const recoveryNote = document.createElement('p');
    recoveryNote.style.cssText = 'margin:10px 0;color:#626860';
    recoveryNote.textContent = t('기기 정보를 확인하지 못했습니다. 처음 설치하거나 복구할 때만 아래 통합 설치를 선택해 주세요.', 'Device information is unavailable. Choose the combined image below only for first installation or recovery.');
    card.append(recoveryNote);
    {
      // Keep the library's action/erase/flash handlers intact. Explicit approval
      // invokes that same action on the same connected port.
      action.style.setProperty('display', 'none', 'important');
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;margin-top:16px';
      const cancel = document.createElement('button'), proceed = document.createElement('button');
      cancel.type = proceed.type = 'button';
      cancel.textContent = t('취소', 'Cancel');
      proceed.textContent = t('최초 설치·복구로 계속', 'Continue with factory / recovery');
      for (const button of [cancel, proceed]) {
        button.style.cssText = 'border:0;border-radius:8px;padding:10px 15px;font:600 14px system-ui;cursor:pointer;background:#e3ecdf;color:#325e49';
      }
      proceed.style.background = '#325e49';
      proceed.style.color = '#fffefa';
      cancel.addEventListener('click', () => dialog._closeDialog());
      proceed.addEventListener('click', () => {
        proceed.disabled = true;
        action.click();
      });
      actions.append(cancel, proceed);
      card.append(actions);
    }
    content.prepend(card);
  };
  observer = new MutationObserver(refresh);
  observer.observe(root, {childList: true, subtree: true});
  dialog.addEventListener('closed', () => observer.disconnect(), {once: true});
  refresh();
}


// The stock completion action returns to its dashboard. After a successful
// install, show the completed screen briefly and close the whole dialog instead.
function finishInstallDialog(dialog) {
  let closed = false;
  let timer;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    if (dialog.isConnected) dialog._closeDialog();
  };
  const button = dialog.shadowRoot.querySelector('div[slot="actions"] ew-text-button');
  if (button) {
    button.textContent = t('닫기', 'Close');
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }, {capture: true});
  }
  dialog.addEventListener('closed', () => {
    closed = true;
    clearTimeout(timer);
  }, {once: true});
  timer = setTimeout(close, 1600);
}

export async function installVersionDialogIntegration(manifestURL, release = null) {
  // Pinned ESP Web Tools 10.4.0 dialog entry, also used by its connect module.
  await import('https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-dialog-im156JnI.js?module');
  const Dialog = customElements.get('ewt-install-dialog');
  if (!Dialog || typeof Dialog.prototype._initialize !== 'function' ||
      typeof Dialog.prototype._closeDialog !== 'function') {
    throw new Error('Unsupported installer dialog');
  }
  if (Dialog.prototype._maydayVersionIntegration) {
    Dialog.prototype._maydayManifestURLs.add(manifestURL.href);
    Dialog.prototype._maydayUsbReleases.set(manifestURL.href, release);
    return;
  }
  Dialog.prototype._maydayManifestURLs = new Set([manifestURL.href]);
  Dialog.prototype._maydayUsbReleases = new Map([[manifestURL.href, release]]);
  const initialize = Dialog.prototype._initialize;
  Dialog.prototype._maydayVersionIntegration = true;
  Dialog.prototype._initialize = async function(justInstalled = false) {
    if (!Dialog.prototype._maydayManifestURLs.has(new URL(this.manifestPath, location.href).href)) {
      return initialize.call(this, justInstalled);
    }
    this._maydayUsbRelease = Dialog.prototype._maydayUsbReleases.get(this.manifestPath);
    if (justInstalled) {
      this._maydayVersionReport = null;
      await initialize.call(this, justInstalled);
      await this.updateComplete;
      if (!this._error && this._state === 'INSTALL' &&
          this._installConfirmed && this._client !== undefined) {
        finishInstallDialog(this);
      }
      return;
    }
    if (!this._maydayVersionReport) {
      observeVersionPanel(this);
      try {
        this._maydayVersionReport = {device: await queryVersion(this.port)};
      } catch (error) {
        this._error = t('USB 연결을 확인하지 못했습니다. 창을 닫고 다시 연결해 주세요.', 'Could not read the USB connection. Close this dialog and reconnect.');
        this._state = 'ERROR';
        this.requestUpdate();
        return;
      }
    }
    await initialize.call(this, justInstalled);
    await this.updateComplete;
    this.requestUpdate();
  };
}
