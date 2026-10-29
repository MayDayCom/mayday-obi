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
ew-dialog > div[slot="headline"]::before {content:"MAYDAY · USB INSTALLER";display:block;font-size:10px;font-weight:700;letter-spacing:.13em;color:#325e49;margin-bottom:12px;}
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
 ['Install MAYDAY OBI','펌웨어 설치'], ['Update MAYDAY OBI','펌웨어 업데이트'],
 ['Logs & Console','연결 로그 확인'], ['Logs','연결 로그'],
 ['Do you want to','대상 펌웨어:'],['install',' '],['update to',' '],['?',' '],
 ['Back','이전'],['Next','다음'],['Install','설치 시작'],['Close','닫기'],
 ['Confirm Installation','설치를 시작할까요?'],['Installing','펌웨어 설치 중'],
 ['Preparing installation','설치 준비 중'],['Erasing','기존 데이터 지우는 중'],
 ['Wrapping up','마무리 중'],['Installation complete!','설치가 완료되었습니다'],
 ['Installation failed','설치하지 못했습니다'],['Connecting','보드에 연결 중'],
 ['Error','연결을 확인해 주세요'],['Disconnected','USB 연결이 끊어졌습니다'],
 ['Erase device','기존 데이터 지우기'],
 ['Do you want to erase the device before installing','설치 전에 기존 데이터를 지울지 선택해 주세요. 대상:'],
 ['? All data on the device will be lost.','. 지우기를 선택하면 보드의 모든 데이터가 삭제됩니다.'],
 ['Erase User Data','기존 설정 지우기'],['Download Logs','로그 저장'],
 ['Reset Device','보드 재시작'],
 ['All data on the device will be erased.','보드에 저장된 모든 데이터가 지워집니다.']
]);
function decorate(dialog) {
 const root = dialog.shadowRoot;
 if (!root || root.querySelector('[data-mayday-theme]')) return;
 const style = document.createElement('style');
 style.dataset.maydayTheme = '';
 style.textContent = theme;
 root.append(style);
 function refresh() {
   // Exact static text matches only. Do not rewrite logs, inputs or error details.
   const selectors = '[slot="headline"], ew-text-button, label.formfield, ew-dialog > div[slot="content"]';
   for (const element of root.querySelectorAll(selectors)) {
     const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
     let node;
     while ((node = walker.nextNode())) {
       if (node.parentElement?.closest('ewt-console, input, textarea')) continue;
       const text = node.nodeValue.trim().replace(/\s+/g,' ');
       const translated = labels.get(text);
       if (translated) node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), translated);
     }
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
 dialog.addEventListener('closed', () => observer.disconnect(), {once:true});
 refresh();
}
function scan(node) {
 if (!(node instanceof Element)) return;
 if (node.matches('ewt-install-dialog')) {
   customElements.whenDefined('ewt-install-dialog').then(async () => {
     await node.updateComplete;
     decorate(node);
   });
 }
 for (const dialog of node.querySelectorAll('ewt-install-dialog')) {
   customElements.whenDefined('ewt-install-dialog').then(async () => {
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
