import React, { useEffect, useReducer, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { candidateRows, candidates, formatYen, initialState, reducer, type Action, type Field } from './src/calculator';

import { colors, type Theme } from './src/theme';

function Calculator({ availableHeight }: { availableHeight: number }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const insets = useSafeAreaInsets();
  const usableHeight = availableHeight - insets.top - insets.bottom;
  const compact = usableHeight < 600;
  const keyHeight = compact ? 44 : 62;
  const options = candidates(Number(state.price));
  const ready = state.received !== '' && state.price !== '';
  const change = Number(state.received) - Number(state.price);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      let action: Action | undefined;
      if (/^\d$/.test(event.key)) action = { type: 'digit', value: event.key };
      else if (event.key === 'Backspace') action = { type: 'backspace' };
      else if (event.key === 'Delete') action = { type: 'clear' };
      else if (event.key === 'Escape') action = { type: 'reset' };
      else if (event.key === 'Enter' && (event.target === document.body || event.target === document.documentElement)) action = { type: 'switch' };
      if (action) { event.preventDefault(); dispatch(action); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const amount = (field: Field, label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${state[field] || '未入力'}円、入力対象にする`} accessibilityState={{selected: state.active === field}} onPress={() => dispatch({type: 'focus', field})}
      style={[styles.amount, compact && styles.amountCompact, state.active === field && styles.amountActive]}>
      <View style={styles.labelRow}><Text style={[styles.label, state.active === field && styles.blue]}>{label}</Text><View style={[styles.dot, state.active === field && styles.dotActive]} /></View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.45} style={[styles.money, compact && styles.moneyCompact, state[field] === '' && styles.placeholder]}>{state[field] === '' ? '0' : formatYen(Number(state[field]))}<Text style={styles.yen}> 円</Text></Text>
    </Pressable>
  );
  const key = (label: string, action: Action, kind = 'number') => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label === '⌫' ? '末尾の1桁を削除' : label} onPress={() => dispatch(action)} style={({pressed}) => [styles.key, {height: keyHeight}, compact && styles.keyCompact, kind === 'action' && styles.actionKey, kind === 'switch' && styles.switchKey, pressed && styles.pressed]}>
      {label === '⌫' ? <View accessible={false} style={styles.backspaceIcon}>
        <View style={styles.backspaceTip}/><View style={styles.backspaceBody}/>
        <View style={[styles.backspaceCross, {transform:[{rotate:'45deg'}]}]}/>
        <View style={[styles.backspaceCross, {transform:[{rotate:'-45deg'}]}]}/>
      </View> : <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.keyText, kind !== 'number' && styles.actionText, kind === 'switch' && styles.switchText]}>{label}</Text>}
    </Pressable>
  );
  return <View style={[styles.screen, {paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right}]}>
    <StatusBar barStyle="light-content" backgroundColor={colors.bg}/>
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.outer, compact && styles.outerCompact, {minHeight: usableHeight}]} bounces={false}>
      <View style={[styles.app, {minHeight: compact ? 294 : undefined}]}>
        <View style={styles.workspace}>
          <View style={styles.main}>
            <View style={[styles.amounts, compact && styles.amountsCompact]}>
              {amount('received', 'お預かり')}{amount('price', '商品代金')}
              <View accessibilityLiveRegion="polite" style={[styles.change, compact && styles.changeCompact, ready && change < 0 && styles.shortage]}>
                <Text style={[styles.changeLabel, ready && change < 0 && styles.shortageText]}>{ready && change < 0 ? '不足額' : 'お釣り'}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.45} style={[styles.changeMoney, compact && styles.moneyCompact, ready && change < 0 && styles.shortageText]}>{ready ? formatYen(Math.abs(change)) : '0'}<Text style={styles.yen}> 円</Text></Text>
              </View>
            </View>
            {renderCandidates()}
            <View style={[styles.keyboard, compact && styles.keyboardCompact]}>
              {[['7','8','9'],['4','5','6'],['1','2','3'],['0','00','000']].map((row, index) => <View key={index} style={styles.keyRow}>
                {row.map(n => key(n, {type: 'digit', value: n}))}
                {index === 0 ? key('全クリア', {type:'reset'}, 'action') : index === 1 ? key('クリア', {type:'clear'}, 'action') : index === 2 ? key('⌫', {type:'backspace'}, 'action') : key('入力切替', {type:'switch'}, 'switch')}
              </View>)}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  </View>;
  function renderCandidates() {
    return <View style={[styles.candidates, compact && styles.candidatesCompact]}>
      {options.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>商品代金を入力すると候補を表示</Text></View> : <View style={styles.candidateGrid}>
        {candidateRows(Number(state.price)).map((values, row) => <View key={row} style={styles.candidateRow}>
          {Array.from({length: Math.max(values.length, 1)}, (_, column) => {
            const value = values[column];
            return value === undefined ? <View key={column} style={styles.candidatePlaceholder}/> : <Pressable key={column} accessibilityRole="button" accessibilityLabel={`お預かり${formatYen(value)}円`} onPress={() => dispatch({type:'candidate',value})} style={({pressed}) => [styles.candidate, Number(state.received) === value && styles.candidateSelected, pressed && styles.pressed]}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.candidateValue, Number(state.received) === value && styles.candidateSelectedText]}>{formatYen(value)}<Text style={styles.smallYen}> 円</Text></Text>
            </Pressable>;
          })}
        </View>)}
      </View>}
    </View>;
  }
}
export default function App() {
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.style.colorScheme = 'dark';
  }, []);
  const [split, setSplit] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(height);
  const installedPwa = Platform.OS === 'web' && typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone === true);
  const desktopPreview = Platform.OS === 'web' && width >= 600 && !installedPwa;
  const previewHeight = Math.max(0, (height - 48) * (split ? 0.5 : 1));
  return <SafeAreaProvider><View style={[styles.host, desktopPreview && styles.previewHost]}>
    {desktopPreview && <View style={styles.previewToolbar}>
      <Text style={styles.previewLabel}>スマホ表示 · 360 × {Math.round(previewHeight)}</Text>
      <Pressable accessibilityRole="button" onPress={() => setSplit(!split)} style={styles.previewToggle}>
        <Text style={styles.previewToggleText}>{split ? '全画面に戻す' : '分割画面で確認'}</Text>
      </Pressable>
    </View>}
    <View onLayout={event => setMeasuredHeight(event.nativeEvent.layout.height)} style={[styles.viewport, desktopPreview && {width:360, height:previewHeight, flex:0, borderRadius:16, overflow:'hidden'}]}>
      <Calculator availableHeight={measuredHeight}/>
    </View>
  </View></SafeAreaProvider>;
}
const createStyles = (colors: Theme) => StyleSheet.create({
  host: { flex: 1 },
  previewHost: { backgroundColor: colors.host, alignItems: 'center', justifyContent: 'flex-start' },
  viewport: { flex: 1, width: '100%' },
  previewToolbar: { width: 360, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  previewLabel: { fontSize: 11, color: colors.muted },
  previewToggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface },
  previewToggleText: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  outer: { flexGrow: 1, padding: 16 },
  outerCompact: { padding: 8 },
  app: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center' },
  workspace: { flexGrow: 1 },
  main: { flexGrow: 1, minWidth: 0 },
  amounts: { gap: 8 },
  amountsCompact: { flexDirection: 'row', gap: 5 },
  amount: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  amountCompact: { flex: 1, minWidth: 0, paddingHorizontal: 7, paddingVertical: 6, flexDirection: 'column', alignItems: 'stretch', gap: 3, borderRadius: 12 },
  amountActive: { borderColor: colors.accent, backgroundColor: colors.raised },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: colors.muted },
  blue: { color: colors.accent },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: colors.accent },
  money: { fontSize: 32, fontWeight: '500', letterSpacing: -0.8, color: colors.ink, fontVariant: ['tabular-nums'], flexShrink: 1 },
  moneyCompact: { fontSize: 25, letterSpacing: -0.6, textAlign: 'right' },
  placeholder: { color: colors.placeholder },
  yen: { fontSize: 12, fontWeight: '500', letterSpacing: 0 },
  change: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  changeCompact: { flex: 1, minWidth: 0, paddingHorizontal: 7, paddingVertical: 7, flexDirection: 'column', alignItems: 'stretch', gap: 3, borderRadius: 12 },
  changeLabel: { color: colors.inverseMuted, fontSize: 12, fontWeight: '600' },
  changeMoney: { fontSize: 48, fontWeight: '500', letterSpacing: -1.5, color: colors.inverse, fontVariant: ['tabular-nums'], flexShrink: 1 },
  shortage: { backgroundColor: colors.active },
  shortageText: { color: colors.ink },
  candidates: { flexGrow: 1, marginTop: 14, marginBottom: 12 },
  candidatesCompact: { marginTop: 6, marginBottom: 0 },
  candidateGrid: { flexGrow: 1, gap: 4 },
  candidateRow: { flexGrow: 1, flexDirection: 'row', gap: 4 },
  candidatePlaceholder: { flex: 1, minHeight: 30 },
  candidate: { flex: 1, minWidth: 0, minHeight: 30, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  candidateSelected: { borderColor: colors.accent, backgroundColor: colors.active },
  candidateValue: { fontSize: 14, color: colors.ink, fontWeight: '500', fontVariant: ['tabular-nums'] },
  candidateSelectedText: { color: colors.ink, fontWeight: '700' },
  smallYen: { fontSize: 9, fontWeight: '400' },
  empty: { flexGrow: 1, minHeight: 30, alignItems: 'center', justifyContent: 'center', padding: 4 },
  emptyTitle: { fontSize: 11, color: colors.muted },
  keyboard: { flexShrink: 0, gap: 8, paddingTop: 12 },
  keyboardCompact: { gap: 5, paddingTop: 6 },
  keyRow: { flexShrink: 0, flexDirection: 'row', gap: 6 },
  key: { flex: 1, minWidth: 0, minHeight: 44, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  keyCompact: { minHeight: 44, borderRadius: 12 },
  actionKey: { backgroundColor: colors.raised },
  switchKey: { backgroundColor: colors.accent, borderColor: colors.accent },
  keyText: { fontSize: 29, fontWeight: '400', color: colors.ink, fontVariant: ['tabular-nums'] },
  actionText: { fontSize: 11, fontWeight: '600' },
  switchText: { color: colors.inverse },
  backspaceIcon: { width: 30, height: 24 },
  backspaceBody: { position: 'absolute', left: 10, top: 3, width: 19, height: 18, borderWidth: 1.8, borderLeftWidth: 0, borderColor: colors.ink, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  backspaceTip: { position: 'absolute', left: 4, top: 5.6, width: 13, height: 13, borderLeftWidth: 1.8, borderBottomWidth: 1.8, borderColor: colors.ink, transform: [{ rotate: '45deg' }] },
  backspaceCross: { position: 'absolute', left: 13, top: 11, width: 10, height: 2, borderRadius: 1, backgroundColor: colors.ink },
  pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
});

const styles = createStyles(colors);
