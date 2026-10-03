export type Field = 'received' | 'price';
export type State = { received: string; price: string; active: Field };
export type Action = { type: 'digit'; value: string } | { type: 'focus'; field: Field } | { type: 'candidate'; value: number } | { type: 'backspace' | 'clear' | 'reset' | 'switch' };
export const initialState: State = { received: '', price: '', active: 'price' };
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'digit': {
      const value = (state[state.active] + action.value).replace(/^0+(?=\d)/, '');
      return value.length > 7 ? state : { ...state, [state.active]: value };
    }
    case 'focus': return { ...state, active: action.field };
    case 'candidate': return { ...state, received: String(action.value), active: 'received' };
    case 'backspace': return { ...state, [state.active]: state[state.active].slice(0, -1) };
    case 'clear': return { ...state, [state.active]: '' };
    case 'reset': return { ...initialState };
    case 'switch': {
      const active = state.active === 'price' ? 'received' : 'price';
      return { ...state, active, [active]: '0' };
    }
  }
}
export function candidateRows(price: number): number[][] {
  if (!Number.isSafeInteger(price) || price <= 0 || price > 9999999) return [[], [], [], []];
  const remainder = price % 100;
  const seen = new Set<number>();
  const unique = (values: number[]) => values.filter(value => {
    if (value < price || value > 9999999 || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
  // Generate candidates before grouping them by their actual thousand-yen range.
  const billRows = [Math.ceil(price / 1000) * 1000, 5000, 10000].map(base =>
    base < price ? [] : unique([base, base + remainder, base + Math.ceil(remainder / 5) * 5, base + Math.ceil(remainder / 10) * 10])
  );
  const nearby = unique([5, 10, 100].map(unit => Math.ceil(price / unit) * unit).filter(value => value > price));
  const groups = new Map<number, number[]>();
  for (const value of [...nearby, ...billRows.flat()].sort((a, b) => a - b)) {
    const range = Math.floor(value / 1000);
    const row = groups.get(range) ?? [];
    row.push(value);
    groups.set(range, row);
  }
  const rows = [...groups.values()];
  while (rows.length < 4) rows.push([]);
  return rows;
}
export function candidates(price: number): number[] {
  return candidateRows(price).flat().sort((a, b) => a - b);
}
export const formatYen = (value: number) => value.toLocaleString('ja-JP');
