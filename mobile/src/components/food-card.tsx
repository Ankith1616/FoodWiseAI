import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Brand, Surface, TextColors, Radius, Spacing } from '@/constants/theme';
import { MacroPanel } from './macro-bar';

export interface FoodCardData {
  id:          string | number;
  name:        string;
  restaurant?: string;
  price:       number;
  match_score?: number;
  ai_reason?:  string;
  image_url?:  string;
  image_emoji?: string;
  protein?:    { grams: number; percent: number };
  carbs?:      { grams: number; percent: number };
  fats?:       { grams: number; percent: number };
  isPrimary?:  boolean;
}

interface FoodCardProps {
  item:       FoodCardData;
  baseUrl?:   string;
  onPress?:   () => void;
  style?:     any;
}

export function FoodCard({ item, baseUrl = '', onPress, style }: FoodCardProps) {
  const matchScore = item.match_score ?? 90;
  const protein    = item.protein ?? { grams: 42, percent: 45 };
  const fats       = item.fats    ?? { grams: 28, percent: 40 };
  const carbs      = item.carbs   ?? { grams: 15, percent: 15 };

  return (
    <View style={[styles.card, style]}>
      {/* Hero Image */}
      <View style={styles.imageWrapper}>
        {item.image_url ? (
          <Image
            source={{ uri: `${baseUrl}${item.image_url}` }}
            style={styles.image}
          />
        ) : (
          <View style={styles.emojiFallback}>
            <Text style={styles.emoji}>{item.image_emoji ?? '🍽️'}</Text>
          </View>
        )}
        {/* Match badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{matchScore}% MATCH</Text>
        </View>
        {/* Price badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>₹{item.price}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>

        {/* AI Reason */}
        {item.ai_reason && (
          <View style={styles.reasonBox}>
            <View style={styles.reasonIconWrap}>
              <Text style={styles.reasonIcon}>🎯</Text>
            </View>
            <Text style={styles.reasonText} numberOfLines={3}>
              {item.ai_reason}
            </Text>
          </View>
        )}

        {/* Macro bars */}
        <View style={styles.macroSection}>
          <MacroPanel protein={protein} carbs={carbs} fats={fats} />
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [
            item.isPrimary ? styles.btnPrimary : styles.btnOutline,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onPress}
        >
          <Text style={item.isPrimary ? styles.btnPrimaryText : styles.btnOutlineText}>
            Select Meal
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Surface.card,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Surface.border,
    overflow:        'hidden',
  },
  imageWrapper: {
    position:       'relative',
    height:         200,
    backgroundColor:Surface.cardAlt,
  },
  image: {
    width:     '100%',
    height:    '100%',
    resizeMode:'cover',
  },
  emojiFallback: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Surface.cardAlt,
  },
  emoji: { fontSize: 80 },
  matchBadge: {
    position:        'absolute',
    top:             12,
    left:            12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      Radius.full,
  },
  matchText: {
    color:      '#FFFFFF',
    fontSize:   10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceBadge: {
    position:        'absolute',
    top:             12,
    right:           12,
    backgroundColor: Surface.white,
    paddingHorizontal: 10,
    paddingVertical:    5,
    borderRadius:       Radius.full,
    shadowColor:        '#000',
    shadowOpacity:      0.08,
    shadowRadius:       4,
    elevation:          2,
  },
  priceText: {
    color:      TextColors.heading,
    fontSize:   12,
    fontWeight: '800',
  },
  body: {
    padding: Spacing.three,
    gap:     Spacing.two,
  },
  name: {
    fontSize:   20,
    fontWeight: '800',
    color:      TextColors.heading,
    lineHeight: 26,
  },
  reasonBox: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:              8,
    backgroundColor: Brand.primaryLight,
    borderRadius:    Radius.sm,
    padding:         Spacing.two,
  },
  reasonIconWrap: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: Brand.primaryBorder,
    alignItems:      'center',
    justifyContent:  'center',
  },
  reasonIcon: { fontSize: 10 },
  reasonText: {
    flex:       1,
    fontSize:   11,
    color:      TextColors.body,
    lineHeight: 16,
  },
  macroSection: {
    paddingTop:    Spacing.one,
    paddingBottom: Spacing.one,
  },
  btnPrimary: {
    backgroundColor: Brand.primary,
    borderRadius:    Radius.sm,
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       Spacing.one,
  },
  btnPrimaryText: {
    color:      TextColors.inverse,
    fontWeight: '700',
    fontSize:   15,
  },
  btnOutline: {
    borderWidth:     1.5,
    borderColor:     Surface.border,
    borderRadius:    Radius.sm,
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       Spacing.one,
  },
  btnOutlineText: {
    color:      TextColors.heading,
    fontWeight: '700',
    fontSize:   15,
  },
});
