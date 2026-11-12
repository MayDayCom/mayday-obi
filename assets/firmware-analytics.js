// Public GA4 web stream ID for the MAYDAY OBI website.
const measurementId = 'G-JDH4XWJYPM';
const publicPages = new Set([
  '/mayday-obi/', '/mayday-obi/index.html',
  '/mayday-obi/en/', '/mayday-obi/en/index.html',
]);
let tag;

function loadTag() {
  if (tag) return tag;
  window.dataLayer = window.dataLayer || [];
  function queue() { window.dataLayer.push(arguments); }

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  queue('js', new Date());
  queue('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  document.head.append(script);
  tag = queue;
  return tag;
}

export function recordFirmwareInstall(installType, release) {
  if (!/^G-[A-Z0-9]+$/.test(measurementId) ||
      location.origin !== 'https://maydaycom.github.io' ||
      !publicPages.has(location.pathname)) return;

  try {
    loadTag()('event', 'firmware_install_success', {
      send_to: measurementId,
      install_type: installType,
      firmware_version: release?.version,
      firmware_build: release?.build,
    });
  } catch {
    // Analytics must never interrupt an install or its completion screen.
  }
}
