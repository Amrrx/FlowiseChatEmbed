import { describe, expect, it } from 'vitest';
import { columnLabel, stepLabel } from './reportLabels';

// Live regression 2026-10-13 B9/B11: the Reports panel showed plan step ids before the operation ("c collect",
// "sort sort") and the preview headers were raw field names (plate, imei, last_seen).
describe('stepLabel', () => {
  it.each([
    ['collect', 'Collect data'],
    ['filter', 'Filter'],
    ['select', 'Choose columns'],
    ['sort', 'Sort'],
    ['match', 'Match records'],
    ['join', 'Combine'],
    ['group', 'Summarize'],
    ['calculate', 'Calculate'],
    ['read_dataset', 'Reuse a saved result'],
  ])('%s → %s', (op, expected) => {
    expect(stepLabel(op)).toBe(expected);
  });

  it('humanizes an operation it does not know', () => {
    expect(stepLabel('rank_rows')).toBe('Rank rows');
  });
});

describe('columnLabel', () => {
  it.each([
    ['plate', 'Plate'],
    ['imei', 'IMEI'],
    ['last_seen', 'Last seen'],
    ['driver.name', 'Driver name'],
    ['calibrated_value', 'Calibrated value'],
    ['received_at', 'Received at'],
  ])('%s → %s', (key, expected) => {
    expect(columnLabel(key)).toBe(expected);
  });
});
