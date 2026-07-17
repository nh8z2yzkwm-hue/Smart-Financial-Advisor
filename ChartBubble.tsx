/**
 * ChartBubble — renders inside the AI advisor chat when the response
 * contains chart data (donut or bar). Uses react-native-svg for crisp
 * vector graphics that match the app's dark navy theme.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useFmt } from '@/hooks/useFmt';

export type ChartDataItem = {
  label: string;
  value: number;
  color: string;
};

export type ChartPayload = {
  chartType: 'donut' | 'bar';
  title: string;
  text: string;       // AI commentary
  unit?: string;      // e.g. 'ريال' or '%'
  data: ChartDataItem[];
  insight?: string;   // optional tip line
};

// ── Palette fallback (if API doesn't supply colors) ───────────────────────────
const PALETTE = [
  '#68D9A4', '#5B8DEE', '#FF6B6B', '#FFC107',
  '#B48BFF', '#00E5FF', '#FF9F43', '#54A0FF',
];

// ── Donut chart drawn with SVG arcs ──────────────────────────────────────────
const SIZE   = 180;
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const R_OUT  = 78;
const R_IN   = 50;
const GAP    = 0.025; // radians gap between segments

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  };
}

function arcPath(
  cx: number, cy: number,
  rOut: number, rIn: number,
  startAngle: number, endAngle: number,
): string {
  const s = polarToXY(cx, cy, rOut, startAngle);
  const e = polarToXY(cx, cy, rOut, endAngle);
  const si = polarToXY(cx, cy, rIn, startAngle);
  const ei = polarToXY(cx, cy, rIn, endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${s.x} ${s.y}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${si.x} ${si.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({ data }: { data: ChartDataItem[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cursor = 0;
  const segments = data.map((d, i) => {
    const frac  = d.value / total;
    const sweep = frac * 2 * Math.PI - GAP;
    const start = cursor + GAP / 2;
    const end   = start + sweep;
    cursor     += frac * 2 * Math.PI;
    return { ...d, start, end, pct: Math.round(frac * 100), color: d.color || PALETTE[i % PALETTE.length] };
  });

  // largest segment for center label
  const biggest = [...segments].sort((a, b) => b.value - a.value)[0];

  return (
    <View style={dc.root}>
      <Svg width={SIZE} height={SIZE}>
        <G>
          {segments.map((seg, i) => (
            <Path
              key={i}
              d={arcPath(CX, CY, R_OUT, R_IN, seg.start, seg.end)}
              fill={seg.color}
            />
          ))}
          {/* Center circle background */}
          <Circle cx={CX} cy={CY} r={R_IN - 2} fill="#0B1521" />
        </G>
      </Svg>
      {/* Center label */}
      <View style={dc.center} pointerEvents="none">
        <Text style={dc.centerPct}>{biggest.pct}%</Text>
        <Text style={dc.centerLabel} numberOfLines={1}>{biggest.label}</Text>
      </View>
    </View>
  );
}

const dc = StyleSheet.create({
  root: { width: SIZE, height: SIZE, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  centerPct: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 24 },
  centerLabel: { color: '#8FA3B8', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2, maxWidth: R_IN * 1.6, textAlign: 'center' },
});

// ── Bar chart (horizontal) ────────────────────────────────────────────────────
function BarChart({ data, unit = '' }: { data: ChartDataItem[]; unit?: string }) {
  const { num } = useFmt();
  const max = Math.max(...data.map(d => d.value));
  return (
    <View style={bc.root}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        const color = d.color || PALETTE[i % PALETTE.length];
        return (
          <View key={i} style={bc.row}>
            <Text style={bc.label} numberOfLines={1}>{d.label}</Text>
            <View style={bc.track}>
              <View style={[bc.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
            </View>
            <Text style={[bc.value, { color }]}>
              {num(d.value)}{unit ? ` ${unit}` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const bc = StyleSheet.create({
  root: { gap: 10, marginTop: 4 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  label: { width: 80, color: '#8FA3B8', fontFamily: 'Inter_500Medium', fontSize: 12, textAlign: 'right' },
  track: { flex: 1, height: 10, backgroundColor: '#1E2F40', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  value: { width: 64, fontFamily: 'Inter_700Bold', fontSize: 12, textAlign: 'left' },
});

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ data, total }: { data: ChartDataItem[]; total: number }) {
  return (
    <View style={lg.root}>
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        const color = d.color || PALETTE[i % PALETTE.length];
        return (
          <View key={i} style={lg.row}>
            <Text style={[lg.pct, { color }]}>{pct}%</Text>
            <Text style={lg.label} numberOfLines={1}>{d.label}</Text>
            <View style={[lg.dot, { backgroundColor: color }]} />
          </View>
        );
      })}
    </View>
  );
}

const lg = StyleSheet.create({
  root: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { color: '#8FA3B8', fontFamily: 'Inter_400Regular', fontSize: 11 },
  pct: { fontFamily: 'Inter_700Bold', fontSize: 11 },
});

// ── Main export ───────────────────────────────────────────────────────────────
export default function ChartBubble({ payload }: { payload: ChartPayload }) {
  const { chartType, title, text, unit, data, insight } = payload;
  const colored = data.map((d, i) => ({ ...d, color: d.color || PALETTE[i % PALETTE.length] }));
  const total   = colored.reduce((s, d) => s + d.value, 0);

  return (
    <View style={cb.wrapper}>
      {/* AI intro text */}
      <Text style={cb.intro}>{text}</Text>

      {/* Chart area */}
      <View style={cb.chartArea}>
        {chartType === 'donut' ? (
          <>
            <DonutChart data={colored} />
            <Legend data={colored} total={total} />
          </>
        ) : (
          <BarChart data={colored} unit={unit} />
        )}
      </View>

      {/* Insight strip */}
      {insight ? (
        <View style={cb.insight}>
          <Text style={cb.insightIcon}>💡</Text>
          <Text style={cb.insightText}>{insight}</Text>
        </View>
      ) : null}
    </View>
  );
}

const cb = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0F1E2E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E2F40',
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  intro: {
    color: '#C8D8E8',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'right',
    lineHeight: 22,
    marginBottom: 14,
  },
  chartArea: { alignItems: 'center' },
  insight: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    backgroundColor: '#132135',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#243347',
  },
  insightIcon: { fontSize: 14 },
  insightText: {
    flex: 1,
    color: '#8FA3B8',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 18,
  },
});
