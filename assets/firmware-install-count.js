import {fetchInstallCount} from './firmware-install-counter-client.js?v=20261112-d1';

const counter = document.querySelector('#firmware-install-count');
let displayedCount = -1;

function showInstallCount(snapshot) {
  if (!snapshot) return;
  const {count, since} = snapshot;
  if (!Number.isSafeInteger(count) || count <= displayedCount ||
      !/^\d{4}-\d{2}-\d{2}$/.test(since)) return;
  const startDate = new Date(since + 'T00:00:00Z');
  if (!Number.isFinite(startDate.getTime()) || startDate.toISOString().slice(0, 10) !== since) return;

  const locale = document.documentElement.lang;
  counter.querySelector('span').textContent = new Intl.NumberFormat(locale).format(count);
  const time = counter.querySelector('time');
  time.dateTime = since;
  time.textContent = new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeZone: 'UTC'}).format(startDate);
  displayedCount = count;
  counter.hidden = false;
}

if (counter) {
  document.addEventListener('mayday-install-count', event => showInstallCount(event.detail));
  fetchInstallCount().then(showInstallCount).catch(() => {
    // Leave the counter hidden when totals are temporarily unavailable.
  });
}
