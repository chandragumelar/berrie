import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storeDate, withinStoreDates} from './history-dates.ts';

const time = (iso: string) => Date.parse(iso);
test('history includes both whole endpoint days in the shop timezone', () => {
  const includes = (iso: string) => withinStoreDates(time(iso), 'Asia/Jakarta', '2026-10-10', '2026-10-12');
  assert.equal(includes('2026-10-09T16:59:59.999Z'), false);
  assert.equal(includes('2026-10-09T17:00:00.000Z'), true);
  assert.equal(includes('2026-10-11T12:00:00.000Z'), true);
  assert.equal(includes('2026-10-12T16:59:59.999Z'), true);
  assert.equal(includes('2026-10-12T17:00:00.000Z'), false);
});
test('same-day history does not lose evening transactions or use UTC dates', () => {
  const instant = time('2026-10-11T17:30:00Z');
  assert.equal(storeDate(instant, 'Asia/Jakarta'), '2026-10-12');
  assert.equal(storeDate(instant, 'America/Los_Angeles'), '2026-10-11');
  assert.equal(withinStoreDates(instant, 'Asia/Jakarta', '2026-10-12', '2026-10-12'), true);
});
test('reversed range is rejected; blank bounds stay independent', () => {
  const instant = time('2026-10-12T05:00:00Z');
  assert.equal(withinStoreDates(instant, 'Asia/Jakarta', '2026-10-13', '2026-10-12'), false);
  assert.equal(withinStoreDates(instant, 'Asia/Jakarta', '', ''), true);
  assert.equal(withinStoreDates(instant, 'Asia/Jakarta', '', '2026-10-11'), false);
  assert.equal(withinStoreDates(instant, 'Asia/Jakarta', '2026-10-13', ''), false);
});
test('calendar comparison works across a daylight-saving transition', () => {
  const includes = (iso: string) => withinStoreDates(time(iso), 'America/New_York', '2026-11-01', '2026-11-01');
  assert.equal(includes('2026-11-01T03:59:59Z'), false);
  assert.equal(includes('2026-11-01T04:00:00Z'), true);
  assert.equal(includes('2026-11-02T04:59:59Z'), true);
  assert.equal(includes('2026-11-02T05:00:00Z'), false);
});
