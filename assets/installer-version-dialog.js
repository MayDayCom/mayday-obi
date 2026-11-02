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
    await writer.write(new TextEncoder().encode('MAYDAY_VERSION?\n'));
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
    if (needsDecision) {
      // Keep the library's action/erase/flash handlers intact. Explicit approval
      // invokes that same action on the same connected port.
      action.style.setProperty('display', 'none', 'important');
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:16px';
      const cancel = document.createElement('button'), proceed = document.createElement('button');
      cancel.type = proceed.type = 'button';
      cancel.textContent = t('취소', 'Cancel');
      proceed.textContent = t('그래도 설치', 'Install anyway');
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

export async function installVersionDialogIntegration(manifestURL) {
  // Pinned ESP Web Tools 10.4.0 dialog entry, also used by its connect module.
  await import('https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-dialog-im156JnI.js?module');
  const Dialog = customElements.get('ewt-install-dialog');
  if (!Dialog || typeof Dialog.prototype._initialize !== 'function' ||
      typeof Dialog.prototype._closeDialog !== 'function') {
    throw new Error('Unsupported installer dialog');
  }
  if (Dialog.prototype._maydayVersionIntegration) return;
  const initialize = Dialog.prototype._initialize;
  Dialog.prototype._maydayVersionIntegration = true;
  Dialog.prototype._initialize = async function(justInstalled = false) {
    if (new URL(this.manifestPath, location.href).href !== manifestURL.href) {
      return initialize.call(this, justInstalled);
    }
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
