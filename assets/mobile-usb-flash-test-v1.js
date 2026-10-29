// MAYDAY OBI · Android USB firmware test (esptool-js + WebUSB serial polyfill)
// Flash images are distributed by this repository at address 0x0.
const root = document.getElementById('mobile-flash-test');
if (root) {
  const $ = selector => root.querySelector(selector);
  const status = $('#mobile-status');
  const detail = $('#mobile-detail');
  const connectButton = $('#mobile-connect');
  const flashButton = $('#mobile-flash');
  const disconnectButton = $('#mobile-disconnect');
  const approval = $('#mobile-confirm');
  const progress = $('#mobile-progress');
  const progressLabel = $('#mobile-progress-label');
  const logs = $('#mobile-log');
  const usbMode = $('#mobile-usb-mode');
  const download = $('#mobile-download');

  const firmwareURL = new URL('../firmware/firmware.bin', import.meta.url);
  const manifestURL = new URL('../firmware/manifest.json', import.meta.url);
  let serialPolyfill, ESPLoader, Transport, transport, loader;
  let ready = false, connected = false, busy = false, flashing = false;
  const log = text => {
    const line = String(text || '').trim();
    if (!line) return;
    logs.textContent = (logs.textContent + line + '\n').slice(-7000);
    logs.scrollTop = logs.scrollHeight;
  };
  const say = (title, message, isError = false) => {
    status.textContent = title;
    detail.textContent = message;
    status.classList.toggle('error', isError);
    log(title + ': ' + message);
  };
  const controls = () => {
    connectButton.disabled = !ready || busy || connected;
    usbMode.disabled = busy || connected;
    flashButton.disabled = !connected || busy || !approval.checked;
    disconnectButton.disabled = !connected || busy;
    approval.disabled = busy || !connected;
  };
  const describeError = err => {
    if (err?.name === 'NotFoundError') return 'USB 장치 선택이 취소되었거나, 지원되는 USB 포트를 찾지 못했습니다.';
    if (err?.name === 'SecurityError') return '브라우저의 USB 접근 권한이 차단되었습니다. Chrome에서 HTTPS 홈페이지로 접속해 주세요.';
    if (err?.name === 'NetworkError') return 'USB 장치와 통신이 끊겼습니다. 데이터 케이블과 보드의 다운로드 모드를 확인해 주세요.';
    return String(err?.message || err || '알 수 없는 오류');
  };
  const cleanup = async () => {
    connected = false;
    approval.checked = false;
    const current = transport;
    transport = null;
    loader = null;
    if (current) {
      try { await current.disconnect(); } catch (err) { log('포트 닫기: ' + describeError(err)); }
    }
  };
  async function preflightFirmware() {
    const manifestRes = await fetch(manifestURL, {cache:'no-store'});
    if (!manifestRes.ok) throw new Error('GitHub 펌웨어 목록을 가져올 수 없습니다.');
    const manifest = await manifestRes.json();
    const part = manifest.builds?.find(x => x.chipFamily === 'ESP32-S3')?.parts?.[0];
    if (part?.path !== 'firmware.bin' || part.offset !== 0) {
      throw new Error('펌웨어 배포 주소가 맞지 않습니다. 기록을 중단합니다.');
    }
    const resp = await fetch(firmwareURL, {cache:'no-store'});
    if (!resp.ok) throw new Error('펌웨어 파일을 다운로드할 수 없습니다.');
    const data = new Uint8Array(await resp.arrayBuffer());
    if (data.length < 0x10024 || data.length > 32 * 1024 * 1024 ||
        data[0] !== 0xe9 || data[12] !== 9 || data[13] !== 0 ||
        data[0x8000] !== 0xaa || data[0x8001] !== 0x50 ||
        data[0x10000] !== 0xe9 || data[0x1000c] !== 9 || data[0x1000d] !== 0 ||
        data[0x10020] !== 0x32 || data[0x10021] !== 0x54 ||
        data[0x10022] !== 0xcd || data[0x10023] !== 0xab) {
      throw new Error('ESP32-S3 통합 펌웨어 형식 검증에 실패했습니다. 기록하지 않습니다.');
    }
    return data;
  }
  download.href = firmwareURL.href;

  connectButton.addEventListener('click', async () => {
    if (!ready || busy) return;
    busy = true;
    approval.checked = false;
    controls();
    try {
      // Preloaded before the user click, preserving USB permission user activation.
      say('USB 포트 선택', '안드로이드 USB 접근 팝업에서 연결된 ESP32-S3를 선택하세요.');
      const options = usbMode.value === 'vendor'
        ? {usbControlInterfaceClass: 0xff}
        : {usbControlInterfaceClass: 0x02};
      const port = await serialPolyfill.requestPort({}, options);
      transport = new Transport(port, false);
      loader = new ESPLoader({
        transport,
        baudrate: 115200,
        debugLogging: false,
        terminal: {clean(){}, writeLine:log, write:log}
      });
      say('ESP32 확인 중', '칩 종류를 읽고 있습니다. 부팅 모드 전환 후 다시 시도해야 할 수도 있습니다.');
      // Try preselected BOOT mode; avoid relying on platform-specific USB reset lines.
      const chip = await loader.main('no_reset');
      if (!/ESP32-S3/i.test(String(chip))) {
        throw new Error('이 펌웨어는 ESP32-S3 전용입니다. 인식 결과: ' + String(chip));
      }
      connected = true;
      say('ESP32-S3 연결 성공', '칩을 인식했습니다. 기록하려면 아래 확인 항목을 체크하세요.');
    } catch (err) {
      say('연결 실패', describeError(err) + ' BOOT 버튼을 누른 채 RESET을 누르고 BOOT을 놓은 다음 재시도해 보세요.', true);
      await cleanup();
    } finally {
      busy = false;
      controls();
    }
  });

  approval.addEventListener('change', controls);
  flashButton.addEventListener('click', async () => {
    if (!connected || busy || !approval.checked || !loader) return;
    if (!window.confirm('ESP32-S3 플래시에 펌웨어를 기록합니다. 진행하면 기존 펌웨어가 변경되고, 설정이 초기화될 수 있습니다. 계속하시겠습니까?')) return;
    busy = true;
    flashing = true;
    controls();
    progress.value = 0;
    progress.hidden = false;
    progressLabel.hidden = false;
    progressLabel.textContent = '펌웨어 확인 중…';
    try {
      say('펌웨어 검증', 'GitHub에 등록된 ESP32-S3 통합 바이너리를 다운로드하고 검사합니다.');
      const data = await preflightFirmware();
      log('펌웨어 검증 완료 · ' + data.length.toLocaleString('ko-KR') + ' bytes · 주소 0x0');
      say('펌웨어 기록 중', 'USB 케이블을 분리하지 마세요. 스마트폰 화면을 켠 상태로 유지해 주세요.');
      await loader.writeFlash({
        fileArray: [{data, address:0}],
        flashMode: 'keep',
        flashFreq: 'keep',
        flashSize: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress(_index, written, total) {
          const pct = Math.min(100, Math.max(0, Math.floor(written * 100 / total)));
          progress.value = pct;
          progressLabel.textContent = '기록 ' + pct + '%';
        }
      });
      progress.value = 100;
      progressLabel.textContent = '기록 100%';
      say('기록 완료', '펌웨어 기록을 완료했습니다. 보드가 재시작되면 화면과 기능을 확인하세요.');
      try { await loader.after('hard_reset', true); }
      catch (err) { log('자동 재시작 실패: ' + describeError(err) + ' · 보드 RESET을 눌러 재시작하세요.'); }
    } catch (err) {
      say('기록 중단', describeError(err) + ' 보드가 부팅되지 않으면 PC USB 설치로 복구하세요.', true);
    } finally {
      flashing = false;
      await cleanup();
      busy = false;
      controls();
    }
  });
  disconnectButton.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    controls();
    await cleanup();
    busy = false;
    say('연결 해제', 'USB 연결을 종료했습니다. 언제든 다시 연결할 수 있습니다.');
    controls();
  });

  (async () => {
    controls();
    if (!window.isSecureContext || !navigator.usb?.requestDevice) {
      say('USB 기능 지원 안 됨', '안드로이드 Chrome의 HTTPS 페이지에서 열어 주세요. USB 접근 기능이 없는 브라우저에서는 연결할 수 없습니다.', true);
      return;
    }
    try {
      // Load both libraries before enabling the connect button: WebUSB device
      // selection must run in a direct user gesture.
      const [polyfill, esp] = await Promise.all([
        import('https://esm.sh/web-serial-polyfill@1.0.15'),
        import('https://esm.sh/esptool-js@0.7.0?bundle')
      ]);
      if (!polyfill.serial?.requestPort || !esp.ESPLoader || !esp.Transport) {
        throw new Error('웹 USB 설치 도구를 로드할 수 없습니다.');
      }
      serialPolyfill = polyfill.serial;
      ESPLoader = esp.ESPLoader;
      Transport = esp.Transport;
      ready = true;
      say('USB 연결 테스트 준비', 'ESP32-S3를 연결하고 BOOT + RESET으로 다운로드 모드에 진입한 뒤 USB 연결 테스트를 누르세요.');
    } catch (err) {
      say('설치 도구 불러오기 실패', describeError(err) + ' 인터넷 연결을 확인한 뒤 페이지를 새로고침해 주세요.', true);
    } finally {
      controls();
    }
  })();
}
