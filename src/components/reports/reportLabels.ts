const STEP_LABELS: Record<string, string> = {
  collect: 'Collect data',
  filter: 'Filter',
  select: 'Choose columns',
  sort: 'Sort',
  match: 'Match records',
  join: 'Combine',
  group: 'Summarize',
  calculate: 'Calculate',
  distinct: 'Remove duplicates',
  union: 'Merge',
  intersect: 'Keep common rows',
  except: 'Exclude rows',
  read_dataset: 'Reuse a saved result',
};

/** Words shown in capitals rather than sentence case. */
const ACRONYMS: Record<string, string> = { imei: 'IMEI', id: 'ID', gps: 'GPS', sim: 'SIM' };

const humanize = (raw: string): string => {
  const words = raw.split(/[._\s]+/).filter(Boolean);
  return words.map((word, i) => ACRONYMS[word.toLowerCase()] ?? (i === 0 ? word[0].toUpperCase() + word.slice(1) : word)).join(' ');
};

/** Customer wording for a report step's operation. */
export const stepLabel = (op: string): string => STEP_LABELS[op] ?? humanize(op);

/** Customer wording for a report column key ("last_seen" → "Last seen", "driver.name" → "Driver name"). */
export const columnLabel = (key: string): string => humanize(key);
