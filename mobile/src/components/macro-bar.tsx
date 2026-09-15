import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Status, TextColors } from '@/constants/theme';

interface MacroBarProps {
  label: string;
  grams: number;
  percent: number;
  color?: string;
}

export function MacroBar({ label, grams, percent, color }: MacroBarProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label} ({grams}g)</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(percent, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.percent}>{percent}%</Text>
    </View>
  );
}

interface MacroPanelProps {
  protein: { grams: number; percent: number };
  carbs:   { grams: number; percent: number };
  fats:    { grams: number; percent: number };
}

export function MacroPanel({ protein, carbs, fats }: MacroPanelProps) {
  return (
    <View style={styles.panel}>
      <MacroBar label="PROTEIN" grams={protein.grams} percent={protein.percent} color={Status.protein} />
      <MacroBar label="FATS"    grams={fats.grams}    percent={fats.percent}    color={Status.carbs}   />
      <MacroBar label="CARBS"   grams={carbs.grams}   percent={carbs.percent}   color={Status.fats}    />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: TextColors.muted,
    letterSpacing: 0.5,
    width: 90,
  },
  track: {
    flex: 1,
    height: 5,
    backgroundColor: '#EBEBEB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  percent: {
    fontSize: 10,
    fontWeight: '700',
    color: TextColors.muted,
    width: 28,
    textAlign: 'right',
  },
});
