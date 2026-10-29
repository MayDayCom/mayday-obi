// Presentation adapter for ESP Web Tools 10.4.0.
// Only styles and static labels change; original controls and event handlers remain.
const theme = `
:host {
 --roboto-font: "Noto Sans KR", system-ui, sans-serif;
 --md-ref-typeface-brand: var(--roboto-font);
 --md-ref-typeface-plain: var(--roboto-font);
 --md-sys-color-primary: #325e49;
 --md-sys-color-on-primary: #fffefa;
 --md-sys-color-on-surface: #292e2b;
 --md-sys-color-on-surface-variant: #626860;
 --md-sys-color-surface: #fffefa;
 --md-sys-color-surface-container: #fffefa;
 --md-sys-color-surface-container-high: #fffefa;
 --md-sys-color-surface-container-highest: #f0f1e9;
 --md-sys-color-secondary-container: #e3ecdf;
 --md-dialog-container-color: #fffefa;
 --md-dialog-container-shape: 20px;
 --md-dialog-headline-font: var(--roboto-font);
 --md-dialog-headline-size: 25px;
 --md-dialog-headline-weight: 700;
 --md-dialog-supporting-text-font: var(--roboto-font);
 --md-dialog-supporting-text-size: 14px;
 --md-dialog-supporting-text-line-height: 24px;
 --md-list-container-color: transparent;
 --md-list-item-label-text-font: var(--roboto-font);
 --md-list-item-label-text-size: 16px;
 --md-list-item-label-text-weight: 600;
 --md-list-item-supporting-text-font: var(--roboto-font);
 --md-list-item-supporting-text-size: 12px;
 --md-text-button-label-text-font: var(--roboto-font);
 --md-text-button-label-text-weight: 600;
 --md-checkbox-selected-container-color: #325e49;
 --text-color: #626860;
 font-family: var(--roboto-font);
}
ew-dialog {width: min(480px, calc(100vw - 32px)); max-width: calc(100vw - 32px);}
:host([state="LOGS"]) ew-dialog {width: min(960px, calc(100vw - 32px));}
ew-dialog > div[slot="headline"] {font-family:var(--roboto-font);letter-spacing:-.04em;line-height:1.4;padding-top:7px;display:block!important;}
ew-dialog > div[slot="headline"]::before {content:"MAYDAY · USB 펌웨어 설치";display:block;font-size:10px;font-weight:700;letter-spacing:.13em;color:#325e49;margin-bottom:12px;}
ew-icon-button[slot="headline"] {top:17px;right:9px;}
ew-dialog ew-list {margin:6px 0 0;padding:0;display:grid;gap:12px;}
ew-list-item[type="button"] {border:1px solid #d4d7cc;border-radius:12px;overflow:hidden;background:#f5f3ec;--md-list-item-leading-space:18px;--md-list-item-trailing-space:18px;--md-list-item-top-space:17px;--md-list-item-bottom-space:17px;min-height:80px;}
ew-list-item[type="button"]:first-child {background:#325e49;border-color:#325e49;--md-list-item-label-text-color:#fffefa;--md-list-item-supporting-text-color:#d9e5d8;--md-list-item-leading-icon-color:#fffefa;--md-list-item-hover-state-layer-color:#fff;--md-list-item-focus-state-layer-color:#fff;}
ew-list-item[type="button"]:first-child svg {color:#fffefa;}
ew-list-item svg {width:25px;height:25px;color:#325e49;}
ew-list-item div[slot="headline"] {padding:0!important;letter-spacing:normal;}
div[slot="supporting-text"] {line-height:1.7;white-space:normal;}
:host([state="DASHBOARD"]) div[slot="content"]::before {content:"연결된 보드에서 진행할 작업을 선택하세요.";display:block;color:#626860;font-size:13px;line-height:1.8;margin:0 0 20px;}
:host([state="DASHBOARD"]) div[slot="content"]::after {content:"설치가 끝날 때까지 USB 케이블을 연결해 두세요.";display:block;color:#777d74;font-size:11px;line-height:1.8;border-top:1px solid #e2e4da;padding-top:17px;margin-top:22px;}
div[slot="actions"] {gap:10px;padding-top:10px;}
ew-text-button {--md-text-button-container-shape:8px;--md-text-button-label-text-color:#325e49;}
ew-text-button:last-child {background:#e3ecdf;border-radius:8px;}
ewt-page-progress {--md-sys-color-primary:#325e49;}
@media(max-width:480px){ew-dialog > div[slot="headline"]{font-size:22px;}ew-list-item[type="button"]{--md-list-item-leading-space:12px;--md-list-item-trailing-space:12px;}ewt-console{width:calc(100vw - 88px);}}
`;
const labels = new Map([
 ["This will take","예상 소요 시간:"],
 ["2 minutes","약 2분"],
 ["a minute","약 1분"],
 ["Keep this page visible to prevent slow down","설치가 느려지지 않도록 이 창을 열어 두세요."],
 ["Preparing installation...","설치 준비 중"],
 ["Initializing...","보드 초기화 중"],
 ["Installation prepared","설치 준비 완료"],
 ["Erasing device...","기존 데이터 삭제 중"],
 ["Device erased","데이터 삭제 완료"],
 ["Writing complete","펌웨어 기록 완료"],
 ["All done!","모든 작업이 완료되었습니다"],
 ["Failed to download manifest","설치 정보를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."],
 ["Failed to initialize. Try resetting your device or holding the BOOT button while clicking INSTALL.","보드를 초기화하지 못했습니다. 보드를 재시작하거나 BOOT 버튼을 누른 상태에서 다시 설치해 주세요."],
 ["Serial port is not readable/writable. Close any other application using it and try again.","USB 포트를 사용할 수 없습니다. 해당 포트를 사용하는 다른 프로그램을 닫고 다시 시도해 주세요."],
 ["Serial port is not ready. Close any other application using it and try again.","USB 포트가 준비되지 않았습니다. 해당 포트를 사용하는 다른 프로그램을 닫고 다시 시도해 주세요."],
 ["No port selected","USB 포트를 선택하지 않았습니다"],
 ["Cancel","취소"],
 ["Try Again","다시 연결"],
 ["If you didn't select a port because you didn't see your device listed, try the following steps:","목록에 보드가 보이지 않는다면 다음 항목을 확인해 주세요."],
 ["Make sure that the device is connected to this computer (the one that runs the browser that shows this website)","이 페이지를 열어 둔 컴퓨터에 보드가 USB로 연결되어 있는지 확인해 주세요."],
 ["Most devices have a tiny light when it is powered on. If yours has one, make sure it is on.","보드에 전원 표시등이 있다면 불이 켜져 있는지 확인해 주세요."],
 ["Make sure that the USB cable you use can be used for data and is not a power-only cable.","충전 전용이 아닌 데이터 전송용 USB 케이블을 사용해 주세요."],
 ["If you are using a Linux flavor, make sure that your user is part of the","Linux에서는 현재 사용자가 다음 그룹에 속해야 합니다:"],
 ["group so it has permission to access the device.","그룹에 포함되어야 장치에 접근할 수 있습니다."],
 ["You may need to log out & back in or reboot to activate the new group access.","권한 적용을 위해 로그아웃 후 다시 로그인하거나 재부팅해야 할 수 있습니다."],
 ["Make sure you have the right drivers installed. Below are the drivers for common chips used in ESP devices:","보드에 맞는 USB 드라이버가 설치되어 있는지 확인해 주세요. 주요 칩의 드라이버는 다음과 같습니다."],
 ["CP2102 drivers:","CP2102 드라이버:"],
 ["CH342, CH343, CH9102 drivers:","CH342·CH343·CH9102 드라이버:"],
 ["CH340, CH341 drivers:","CH340·CH341 드라이버:"],
 ["(download via blue button with","(파란색 다운로드 버튼의"],
 ["icon)","아이콘을 눌러 받으세요)"],
 ["Configure Wi-Fi","Wi-Fi 설정"],
 ["Change Wi-Fi","Wi-Fi 변경"],
 ["Connect to Wi-Fi","Wi-Fi 연결"],
 ["Connect","연결"],
 ["Continue","계속"],
 ["Skip","건너뛰기"],
 ["Visit Device","기기 페이지 열기"],
 ["Scanning for networks","Wi-Fi 검색 중"],
 ["Trying to connect","Wi-Fi 연결 중"],
 ["Device connected to the network!","Wi-Fi에 연결되었습니다"],
 ["Connect your device to the network to start using it.","사용할 Wi-Fi를 선택하고 보드를 연결해 주세요."],
 ["Unable to connect","연결하지 못했습니다"],
 ["Timeout","연결 시간이 초과되었습니다"],
 ["Join other…","다른 Wi-Fi 연결…"],
 ["Network","Wi-Fi"],
 ["Network Name","Wi-Fi 이름"],
 ["Password","비밀번호"],
 ["Your device is running","현재 펌웨어:"],
 ["Do you want to reset your device and erase all user data from your device?","보드를 초기화하고 저장된 모든 사용자 데이터를 지울까요?"],
 ["Add to Home Assistant","Home Assistant에 추가"],
 ["Fund Development","개발 후원"],
 ['Install MAYDAY OBI','펌웨어 설치'], ['Update MAYDAY OBI','펌웨어 업데이트'],
 ['Logs & Console','연결 로그 확인'], ['Logs','연결 로그'],
 ['Do you want to','대상 펌웨어:'],['install',' '],['update to',' '],['?',' '],
 ['Back','이전'],['Next','다음'],['Install','설치 시작'],['Close','닫기'],
 ['Confirm Installation','설치를 시작할까요?'],['Installing','펌웨어 설치 중'],
 ['Preparing installation','설치 준비 중'],['Erasing','기존 데이터 지우는 중'],
 ['Wrapping up','마무리 중'],['Installation complete!','설치가 완료되었습니다'],
 ['Installation failed','설치하지 못했습니다'],['Connecting','보드에 연결 중'],
 ['Error','연결을 확인해 주세요'],['Disconnected','USB 연결이 끊어졌습니다'],
 ['Erase device','설치 방식 선택'],
 ['Do you want to erase the device before installing','기존 데이터 삭제는 선택 사항입니다. 설치 대상:'],
 ['? All data on the device will be lost.','. 체크하지 않아도 다음 단계로 진행할 수 있습니다. 체크하면 보드의 저장 설정과 데이터가 삭제됩니다.'],
 ['Erase User Data','기존 설정 지우기'],['Download Logs','로그 저장'],
 ['Reset Device','보드 재시작'],
 ['All data on the device will be erased.','보드에 저장된 모든 데이터가 지워집니다.']
]);
// Translate UI text only; retain device logs, commands, percentages and diagnostics.
function translateTree(root) {
 const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
 let node;
 while ((node = walker.nextNode())) {
   if (node.parentElement?.closest('style, script, ewt-console, input, textarea, code, svg')) continue;
   const original = node.nodeValue.trim();
   const text = original.replace(/\s+/g, ' ');
   let translated = text === 'Erase device' && node.parentElement?.closest('label.formfield')
     ? '보드 저장 설정·데이터 전체 삭제 후 설치 (선택 사항)'
     : labels.get(text);
   if (!translated && /^Your (ESP[\w-]+) board is not supported\.$/.test(text)) {
     translated = text.replace(/^Your (ESP[\w-]+) board is not supported\.$/, '$1 보드는 이 펌웨어의 지원 대상이 아닙니다.');
   }
   if (!translated && /^(?:Error: )?Downloading firmware (.+) failed: (\d+)$/.test(text)) {
     translated = text.replace(/^(?:Error: )?Downloading firmware (.+) failed: (\d+)$/, '펌웨어 $1 다운로드에 실패했습니다. (오류 $2)');
   }
   if (translated && translated !== original) node.nodeValue = node.nodeValue.replace(original, translated);
 }
 for (const field of root.querySelectorAll('ew-filled-text-field, ew-filled-select')) {
   const label = field.getAttribute('label');
   if (labels.has(label)) field.setAttribute('label', labels.get(label));
 }
}
function decorate(dialog) {
 const root = dialog.shadowRoot;
 if (!root || root.querySelector('[data-mayday-theme]')) return;
 const style = document.createElement('style');
 style.dataset.maydayTheme = '';
 style.textContent = theme;
 root.append(style);
 const observedRoots = new WeakSet();
 const pageObservers = [];
 function observePage(page) {
   // Lit can detach and reuse page elements between installation stages.
   // Translate on every appearance, and only mark an actual shadow root as observed.
   customElements.whenDefined(page.localName).then(async () => {
     await page.updateComplete;
     const pageRoot = page.shadowRoot;
     if (!pageRoot) return;
     translateTree(pageRoot);
     if (observedRoots.has(pageRoot)) return;
     observedRoots.add(pageRoot);
     const observer = new MutationObserver(() => translateTree(pageRoot));
     observer.observe(pageRoot, {childList:true,subtree:true,characterData:true});
     pageObservers.push(observer);
   });
 }

 function refresh() {
   translateTree(root);
   for (const child of root.querySelectorAll('ewt-page-progress, ewt-page-message')) {
     observePage(child);
   }
   for (const item of root.querySelectorAll('ew-list-item[type="button"]')) {
     const title = item.querySelector('[slot="headline"]')?.textContent.trim();
     const description = title === '펌웨어 설치' || title === '펌웨어 업데이트'
       ? 'MAYDAY OBI를 보드에 설치합니다'
       : title === '연결 로그 확인' ? '연결 상태와 동작 기록을 확인합니다' : null;
     if (description && !item.querySelector('[slot="supporting-text"]')) {
       const supporting = document.createElement('div');
       supporting.slot = 'supporting-text';
       supporting.textContent = description;
       item.append(supporting);
     }
   }
   for (const button of root.querySelectorAll('ew-icon-button[slot="headline"]')) {
     if (button.getAttribute('aria-label') !== '닫기') button.setAttribute('aria-label','닫기');
   }
 }
 const observer = new MutationObserver(refresh);
 observer.observe(root, {childList:true,subtree:true,characterData:true});
 dialog.addEventListener('closed', () => {
   observer.disconnect();
   pageObservers.forEach(observer => observer.disconnect());
 }, {once:true});
 refresh();
}
function scan(node) {
 if (!(node instanceof Element)) return;
 if (node.matches('ewt-install-dialog, ewt-no-port-picked-dialog')) {
   customElements.whenDefined(node.localName).then(async () => {
     await node.updateComplete;
     decorate(node);
   });
 }
 for (const dialog of node.querySelectorAll('ewt-install-dialog, ewt-no-port-picked-dialog')) {
   customElements.whenDefined(dialog.localName).then(async () => {
     await dialog.updateComplete;
     decorate(dialog);
   });
 }
}
const observer = new MutationObserver(records => {
 for (const record of records) for (const node of record.addedNodes) scan(node);
});
observer.observe(document.body, {childList:true,subtree:true});
scan(document.body);
