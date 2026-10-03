import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidateRows, candidates, initialState, reducer } from '../src/calculator.ts';
test('2521円の候補が要求通りになる', () => {
  assert.deepEqual(candidates(2521), [2525,2530,2600,3000,3021,3025,3030,5000,5021,5025,5030,10000,10021,10025,10030]);
});
test('端数0は重複せず、金額を下回る候補を出さない', () => {
  assert.deepEqual(candidates(5000), [5000,10000]);
  for (const price of [1,99,999,5001,9999,10001,9999999]) {
    const values = candidates(price);
    assert.equal(values.length, new Set(values).size);
    assert.ok(values.every(n => n >= price && n <= 9999999));
  }
  assert.deepEqual(candidates(0), []);
});
test('入力先、BS、入力クリア、全消去を区別する', () => {
  let s = reducer(initialState,{type:'digit',value:'2521'});
  s = reducer(s,{type:'candidate',value:3021});
  assert.equal(Number(s.received)-Number(s.price),500);
  s = reducer(s,{type:'backspace'});
  assert.equal(s.received,'302');
  s = reducer(s,{type:'clear'});
  assert.equal(s.received,''); assert.equal(s.price,'2521');
  s = reducer(s,{type:'switch'}); assert.equal(s.active,'price');
  assert.deepEqual(reducer(s,{type:'reset'}),initialState);
});
test('先頭ゼロを除き、7桁を超える入力を拒否する', () => {
  let s = reducer(initialState,{type:'digit',value:'00'});
  s = reducer(s,{type:'digit',value:'1'}); assert.equal(s.price,'1');
  s = reducer(s,{type:'digit',value:'234567'});
  assert.equal(reducer(s,{type:'digit',value:'8'}).price,'1234567');
});

test('2761円は近い硬貨の支払い候補も出す', () => {
  assert.deepEqual(candidates(2761), [2765,2770,2800,3000,3061,3065,3070,5000,5061,5065,5070,10000,10061,10065,10070]);
  assert.deepEqual(candidates(2765).slice(0,2), [2770,2800]);
  assert.deepEqual(candidates(2769).slice(0,2), [2770,2800]);
  assert.equal(candidates(2799).filter(n => n === 2800).length, 1);
});

test('5円候補も4行で省略せず表示する', () => {
  const rows = candidateRows(2761);
  assert.deepEqual(rows, [[2765,2770,2800],[3000,3061,3065,3070],[5000,5061,5065,5070],[10000,10061,10065,10070]]);
  for (let price = 1; price < 20000; price++) {
    const rows = candidateRows(price);
    assert.equal(rows.length, 4);
    for (const row of rows) assert.ok(row.every(value => Math.floor(value / 1000) === Math.floor(row[0] / 1000)));
    assert.deepEqual(rows.flat().sort((a,b) => a-b), candidates(price));
  }
  for (const price of [2765,2766,2770]) {
    const values = candidates(price);
    assert.equal(values.length, new Set(values).size);
  }
});

test('同じ千円台の候補を同じ行にまとめる', () => {
  assert.deepEqual(candidateRows(2411), [[2415,2420,2500],[3000,3011,3015,3020],[5000,5011,5015,5020],[10000,10011,10015,10020]]);
  assert.deepEqual(candidateRows(2450), [[2500],[3000,3050],[5000,5050],[10000,10050]]);
  assert.deepEqual(candidateRows(5000), [[5000],[10000],[],[]]);
});

test('入力切替は切替先だけを0にし次の数字から入力できる', () => {
  let state = { received: '5000', price: '2411', active: 'price' as const };
  const switched = reducer(state, {type:'switch'});
  assert.equal(switched.active, 'received');
  assert.equal(switched.received, '0');
  assert.equal(switched.price, '2411');
  const entered = reducer(switched, {type:'digit',value:'3'});
  assert.equal(entered.received, '3');
  const back = reducer(entered, {type:'switch'});
  assert.equal(back.price, '0');
  assert.equal(back.received, '3');
  assert.equal(reducer(state, {type:'focus',field:'received'}).received, '5000');
});

test('切り上げで千円台を跨いだ候補は同じ金額帯の行に合流する', () => {
  assert.deepEqual(candidateRows(2991), [[2995],[3000,3091,3095,3100],[5000,5091,5095,5100],[10000,10091,10095,10100]]);
  assert.deepEqual(candidateRows(2999), [[3000,3099,3100],[5000,5099,5100],[10000,10099,10100],[]]);
});
