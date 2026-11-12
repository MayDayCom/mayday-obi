const siteOrigin = 'https://maydaycom.github.io';
const counterUrl = 'https://mayday-obi-install-counter.cgibank0.workers.dev/install-count';
const publicPages = new Set([
  '/mayday-obi/', '/mayday-obi/index.html',
  '/mayday-obi/en/', '/mayday-obi/en/index.html',
]);

export async function fetchInstallCount() {
  const response = await fetch(counterUrl, {cache: 'no-store', signal: AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error('Install count unavailable');
  return response.json();
}

export function recordFirmwareInstall(type) {
  if (location.origin !== siteOrigin || !publicPages.has(location.pathname)) return;

  const body = JSON.stringify({id: crypto.randomUUID(), type});
  async function submit() {
    const response = await fetch(counterUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body,
      keepalive: true,
      signal: AbortSignal.timeout(7000),
    });
    if (response.status >= 500) throw new Error('Install count unavailable');
    return response.ok ? response.json() : null;
  }

  // Retry the same event once so a lost response cannot count an install twice.
  submit().catch(submit).then(snapshot => {
    if (snapshot) document.dispatchEvent(new CustomEvent('mayday-install-count', {detail: snapshot}));
  }).catch(error => console.warn('USB install count could not be recorded', error));
}
