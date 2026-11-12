const counter = document.querySelector('#firmware-install-count');
const liveSnapshot = 'https://raw.githubusercontent.com/MayDayCom/mayday-obi/main/assets/firmware-install-count.json';

async function readSnapshot(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(4000)});
  if (!response.ok) throw new Error('Install count unavailable');
  return response.json();
}

async function showInstallCount() {
  // Actions can refresh the repository snapshot independently of the Pages build.
  const {count, since} = await readSnapshot(liveSnapshot)
    .catch(() => readSnapshot(new URL('./firmware-install-count.json', import.meta.url)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return;

  const startDate = new Date(since + 'T00:00:00Z');
  if (!Number.isFinite(startDate.getTime()) || startDate.toISOString().slice(0, 10) !== since) return;
  const locale = document.documentElement.lang;
  if (Number.isSafeInteger(count) && count >= 0) {
    counter.querySelector('span').textContent = new Intl.NumberFormat(locale).format(count);
    counter.querySelector('[data-count-ready]').hidden = false;
    counter.querySelector('[data-count-pending]').hidden = true;
  }
  const time = counter.querySelector('time');
  time.dateTime = since;
  time.textContent = new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeZone: 'UTC'}).format(startDate);
  counter.hidden = false;
}

if (counter) {
  showInstallCount().catch(() => {
    // Leave the counter hidden when totals are temporarily unavailable.
  });
}
