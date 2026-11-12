import {readFile, writeFile} from 'node:fs/promises';

const snapshotPath = new URL('../../assets/firmware-install-count.json', import.meta.url);
const {since} = JSON.parse(await readFile(snapshotPath, 'utf8'));
const token = process.env.GA4_ACCESS_TOKEN;
if (!token || !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  throw new Error('GA4 access token and tracking start date are required');
}

const response = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/563886388:runReport', {
  method: 'POST',
  headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
  body: JSON.stringify({
    dateRanges: [{startDate: since, endDate: 'today'}],
    metrics: [{name: 'eventCount'}],
    dimensionFilter: {filter: {
      fieldName: 'eventName',
      stringFilter: {matchType: 'EXACT', value: 'firmware_install_success', caseSensitive: true},
    }},
  }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error('GA4 report request failed (HTTP ' + response.status + ')');

const report = await response.json();
const value = report.rows?.[0]?.metricValues?.[0]?.value ?? (report.rowCount ? null : '0');
const count = Number(value);
if (!/^\d+$/.test(value) || !Number.isSafeInteger(count)) {
  throw new Error('GA4 did not return a valid event count');
}
await writeFile(snapshotPath, JSON.stringify({count, since}) + '\n', 'utf8');
