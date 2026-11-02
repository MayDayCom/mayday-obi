import { stageUsbFirmware, decideUsbFirmware } from './usb-ota-client.js?v=20261102-staged';
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
            running: info.RUN, target: info.TARGET, size: Number(info.SIZE)
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
    '현재 ' + device.running + ' 파티션을 유지하고 ' + device.target + ' 파티션에 저장합니다. 저장 후 재부팅 시점을 선택할 수 있습니다.',
    'Keep ' + device.running + ' running and save to ' + device.target + '. Choose when to restart after saving.');
  card.append(detail);
  const progress = document.createElement('progress');
  progress.max = 100; progress.value = 0; progress.hidden = true;
  progress.style.cssText = 'width:100%;margin-top:12px;accent-color:#325e49';
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
  async function decide(reboot) {
    dialog._maydayUsbBusy = true;
    for (const node of actions.children) node.disabled = true;
    try {
      await decideUsbFirmware(dialog.port, reboot);
      note.textContent = reboot
        ? t('새 버전으로 재부팅합니다. 이전 버전은 기기의 복구 기능에서 선택할 수 있습니다.', 'Restarting into the new version. The previous version remains available in the device’s restore function.')
        : t('현재 버전을 유지합니다. 저장한 펌웨어는 나중에 기기에서 적용할 수 있습니다.', 'Keeping the current version. Apply the saved firmware later from the device.');
      actions.replaceChildren();
      finishInstallDialog(dialog);
    } catch (error) {
      note.textContent = t('기기의 재부팅 여부와 화면을 확인해 주세요. 선택 결과를 확인하지 못했습니다.', 'Check the device screen and restart status. The selection could not be confirmed.');
      for (const node of actions.children) node.disabled = false;
    } finally { dialog._maydayUsbBusy = false; }
  }
  button(t('취소', 'Cancel'), () => dialog._closeDialog());
  const start = button(needsDecision ? t('그래도 업데이트 저장', 'Save update anyway') : t('업데이트 저장', 'Save update'), async () => {
    dialog._maydayUsbBusy = true;
    for (const node of actions.children) node.disabled = true;
    progress.hidden = false;
    note.textContent = t('반대편 파티션에 저장 중입니다. USB 연결을 유지해 주세요.', 'Saving to the inactive partition. Keep USB connected.');
    try {
      await stageUsbFirmware(dialog.port, release, device, percent => {
        progress.value = percent;
        note.textContent = percent === 100
          ? t('기록을 마쳤습니다. 파일을 검증하고 있습니다.', 'Writing finished. Verifying the image.')
          : t('반대편 파티션에 저장 중 · ' + percent + '%', 'Saving to inactive partition · ' + percent + '%');
      });
      progress.value = 100;
      note.textContent = t('저장 완료. 현재 버전은 유지되고 있습니다. 지금 새 버전으로 재부팅할까요?', 'Saved. The current version is still running. Restart into the new version now?');
      actions.replaceChildren();
      button(t('나중에', 'Later'), () => decide(false));
      button(t('지금 재부팅', 'Restart now'), () => decide(true), true);
    } catch (error) {
      progress.hidden = true;
      note.textContent = error.message === 'BOOT_ALREADY_PENDING'
        ? t('이미 적용 대기 중인 펌웨어가 있습니다. 기기 화면에서 먼저 확인해 주세요.', 'A firmware change is already pending. Check the device screen first.')
        : t('업데이트 저장을 완료하지 못했습니다. USB 연결을 확인하고 20초 후 다시 연결해 주세요.', 'The update could not be saved. Check USB and reconnect after 20 seconds.');
      actions.replaceChildren();
      button(t('닫기', 'Close'), () => dialog._closeDialog());
    } finally { dialog._maydayUsbBusy = false; }
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
            : t('새 버전을 설치할 수 있습니다.', 'A newer version is available.');
    card.append(note);
    const release = dialog._maydayUsbRelease;
    if (device?.usbOta && release?.appBytes) {
      attachUsbUpdate(dialog, card, action, note, release, device, needsDecision);
      content.prepend(card);
      return;
    }
    const recoveryNote = document.createElement('p');
    recoveryNote.style.cssText = 'margin:10px 0;color:#626860';
    recoveryNote.textContent = device?.usbOta
      ? t('현재 배포본에는 일반 업데이트 파일이 없습니다. 아래 복구 설치는 기존 파티션 구성을 덮어쓸 수 있습니다.', 'This release has no app update image. Recovery installation below can overwrite the existing partition setup.')
      : device
        ? t('이 기기의 현재 펌웨어는 USB 반대편 파티션 업데이트를 지원하지 않습니다. 기기의 Wi-Fi 업데이트 기능을 사용하거나 최초 설치·복구를 선택해 주세요.', 'This firmware does not support USB updates to the inactive partition. Use the device’s Wi-Fi updater or explicitly choose factory/recovery installation.')
        : t('기기 정보를 확인하지 못했습니다. 최초 설치·복구는 기존 설정과 파티션 내용을 덮어쓸 수 있습니다.', 'Device information is unavailable. Factory/recovery installation can overwrite saved settings and partition contents.');
    card.append(recoveryNote);
    {
      // Keep the library's action/erase/flash handlers intact. Explicit approval
      // invokes that same action on the same connected port.
      action.style.setProperty('display', 'none', 'important');
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:16px';
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
