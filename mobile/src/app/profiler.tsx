/**
 * FoodWiseAI — Visual Appetite Profiler
 * Tinder-style swiper — logic unchanged, redesigned to match new design system.
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  Platform,
  Image,
  ActivityIndicator,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Surface, TextColors, Radius, Spacing, Status } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import api, { rawBaseUrl } from '@/services/api';

const IMG = (f: string) => `${rawBaseUrl}/static/images/dishes/${f}`;

interface ProfilerCard {
  id:          number;
  name:        string;
  restaurant:  string;
  price:       number;
  rating:      number;
  category:    string;
  image_emoji: string;
  image_url?:  string;
  img?:        string; // local fallback filename
}


const isWeb    = Platform.OS === 'web';
const CARD_W   = isWeb ? 420 : Dimensions.get('window').width * 0.88;
const CARD_H   = isWeb ? 500 : 430;

// Category accent colors (border only — card bg stays white)
const CAT_ACCENT: Record<string, string> = {
  Italian:    '#E74C3C',
  Healthy:    '#2ECC71',
  'Fast Food':'#F39C12',
  Desserts:   '#9B59B6',
  Indian:     Brand.orange,
};

export default function ProfilerScreen() {
  const router = useRouter();
  const { setLikedDishIds, setTasteRecommendations, setUserVectorSummary, updateSurveyPreferences } = useAppStore();

  const [cards,        setCards]        = useState<ProfilerCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedIds,     setLikedIds]     = useState<number[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 10-Field Survey State
  const [surveyStep, setSurveyStep] = useState<number>(0);
  const [favCuisines, setFavCuisines] = useState<string[]>(['Indian', 'Italian']);
  const [favFoods, setFavFoods] = useState<string[]>(['Chicken Biryani', 'Paneer Tikka']);
  const [allergies, setAllergies] = useState<string[]>(['None']);
  const [restrictions, setRestrictions] = useState<string[]>(['Non-Veg']);
  const [goals, setGoals] = useState<string[]>(['Lean Muscle Gain']);
  const [timings, setTimings] = useState<string[]>(['Lunch ☀️', 'Dinner 🌙']);
  const [frequency, setFrequency] = useState('4–5 times a week');
  const [spice, setSpice] = useState('Medium 🌶️');
  const [sweet, setSweet] = useState('Moderate Sweet Tooth 🍯');
  const [budget, setBudget] = useState('₹200 – ₹400 per meal (₹₹)');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/recommendations/profiler-cards');
        setCards(res.data);
      } catch {
        // Use fallback cards
        setCards(FALLBACK_CARDS);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSwipe = (like: boolean) => {
    const card          = cards[currentIndex];
    const updatedLikes  = like ? [...likedIds, card.id] : likedIds;
    if (like) setLikedIds(updatedLikes);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(p => p + 1);
    } else {
      submitProfile(updatedLikes);
    }
  };

  const submitProfile = async (finalIds: number[]) => {
    setIsSubmitting(true);
    // Save survey responses to Zustand
    updateSurveyPreferences({
      favoriteCuisines: favCuisines,
      favoriteFoods: favFoods,
      allergies,
      dietaryRestrictions: restrictions,
      healthGoals: goals,
      mealTimings: timings,
      orderingFrequency: frequency,
      spicePreference: spice,
      sweetPreference: sweet,
      budget,
    });

    try {
      const res = await api.post('/recommendations/taste-profile', { liked_dish_ids: finalIds });
      setLikedDishIds(finalIds);
      setTasteRecommendations(res.data.recommendations);
      setUserVectorSummary(res.data.user_vector_summary);
      router.replace('/explore');
    } catch {
      setIsSubmitting(false);
      router.replace('/explore');
    }
  };

  // ── Loading / Submitting states ──────────────────────────────
  if (isLoading || isSubmitting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <Text style={styles.loadingTitle}>
          {isLoading ? 'Loading Appetite Vectors...' : '🤖 Mapping Your Taste Profile'}
        </Text>
        <Text style={styles.loadingSub}>
          {isLoading
            ? 'Fetching CNN feature embeddings'
            : 'Extracting visual similarity matrices via cosine distance'}
        </Text>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>😕</Text>
        <Text style={styles.loadingTitle}>No dishes found</Text>
        <Text style={styles.loadingSub}>Please try again later.</Text>
      </View>
    );
  }

  const card   = cards[currentIndex];
  const accent = CAT_ACCENT[card.category] ?? Brand.primary;
  const prog   = ((currentIndex + 1) / cards.length) * 100;

  if (surveyStep === 0) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.surveyScroll}>
            <View style={styles.surveyBox}>
              <View style={styles.surveyHeader}>
                <Text style={{ fontSize: 24 }}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.surveyTag}>FOODWISE AI APETITE SURVEY</Text>
                  <Text style={styles.surveyTitle}>Personal Preference Questionnaire</Text>
                </View>
              </View>

              {/* 1. Favorite Cuisines */}
              <Text style={styles.surveyQuestion}>1. What are your favorite cuisines?</Text>
              <View style={styles.chipGrid}>
                {['Indian', 'Italian', 'Fast Food', 'Healthy', 'Chinese', 'Mexican', 'Desserts'].map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.surveyChip, favCuisines.includes(c) && styles.surveyChipActive]}
                    onPress={() =>
                      setFavCuisines((prev) =>
                        prev.includes(c) ? prev.filter((i) => i !== c) : [...prev, c]
                      )
                    }
                  >
                    <Text style={[styles.surveyChipText, favCuisines.includes(c) && styles.surveyChipTextActive]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 2. Favorite Foods */}
              <Text style={styles.surveyQuestion}>2. Which dishes do you enjoy most?</Text>
              <View style={styles.chipGrid}>
                {['Chicken Biryani', 'Paneer Tikka', 'Masala Dosa', 'Gulab Jamun', 'Pizza', 'Samosa', 'Tandoori Roti'].map((f) => (
                  <Pressable
                    key={f}
                    style={[styles.surveyChip, favFoods.includes(f) && styles.surveyChipActive]}
                    onPress={() =>
                      setFavFoods((prev) =>
                        prev.includes(f) ? prev.filter((i) => i !== f) : [...prev, f]
                      )
                    }
                  >
                    <Text style={[styles.surveyChipText, favFoods.includes(f) && styles.surveyChipTextActive]}>
                      ❤️ {f}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 3. Allergies */}
              <Text style={styles.surveyQuestion}>3. Do you have any food allergies?</Text>
              <View style={styles.chipGrid}>
                {['None', 'Peanuts', 'Dairy / Lactose', 'Gluten', 'Shellfish', 'Soy'].map((a) => (
                  <Pressable
                    key={a}
                    style={[styles.surveyChip, allergies.includes(a) && styles.surveyChipActive]}
                    onPress={() => setAllergies([a])}
                  >
                    <Text style={[styles.surveyChipText, allergies.includes(a) && styles.surveyChipTextActive]}>
                      ⚠️ {a}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 4. Dietary Restrictions */}
              <Text style={styles.surveyQuestion}>4. What is your primary dietary preference?</Text>
              <View style={styles.chipGrid}>
                {['Veg', 'Non-Veg', 'Eggetarian', 'Keto', 'Vegan'].map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.surveyChip, restrictions.includes(r) && styles.surveyChipActive]}
                    onPress={() => setRestrictions([r])}
                  >
                    <Text style={[styles.surveyChipText, restrictions.includes(r) && styles.surveyChipTextActive]}>
                      🥗 {r}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 5. Health Goals */}
              <Text style={styles.surveyQuestion}>5. What are your core health goals?</Text>
              <View style={styles.chipGrid}>
                {['Lean Muscle Gain', 'Caloric Management', 'High Protein', 'Weight Loss', 'Heart Healthy'].map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.surveyChip, goals.includes(g) && styles.surveyChipActive]}
                    onPress={() =>
                      setGoals((prev) =>
                        prev.includes(g) ? prev.filter((i) => i !== g) : [...prev, g]
                      )
                    }
                  >
                    <Text style={[styles.surveyChipText, goals.includes(g) && styles.surveyChipTextActive]}>
                      🎯 {g}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 6. Meal Timings */}
              <Text style={styles.surveyQuestion}>6. Which meal slots do you order most?</Text>
              <View style={styles.chipGrid}>
                {['Breakfast 🌅', 'Lunch ☀️', 'Evening Snacks ☕', 'Dinner 🌙'].map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.surveyChip, timings.includes(t) && styles.surveyChipActive]}
                    onPress={() =>
                      setTimings((prev) =>
                        prev.includes(t) ? prev.filter((i) => i !== t) : [...prev, t]
                      )
                    }
                  >
                    <Text style={[styles.surveyChipText, timings.includes(t) && styles.surveyChipTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 7. Ordering Frequency */}
              <Text style={styles.surveyQuestion}>7. How often do you order food per week?</Text>
              <View style={styles.chipGrid}>
                {['1–2 times a week', '3–4 times a week', 'Daily / 5+ times'].map((fq) => (
                  <Pressable
                    key={fq}
                    style={[styles.surveyChip, frequency === fq && styles.surveyChipActive]}
                    onPress={() => setFrequency(fq)}
                  >
                    <Text style={[styles.surveyChipText, frequency === fq && styles.surveyChipTextActive]}>
                      🛵 {fq}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 8. Spice Preference */}
              <Text style={styles.surveyQuestion}>8. Preferred Spice Level?</Text>
              <View style={styles.chipGrid}>
                {['Mild 🍃', 'Medium 🌶️', 'Extremely Spicy 🔥'].map((sp) => (
                  <Pressable
                    key={sp}
                    style={[styles.surveyChip, spice === sp && styles.surveyChipActive]}
                    onPress={() => setSpice(sp)}
                  >
                    <Text style={[styles.surveyChipText, spice === sp && styles.surveyChipTextActive]}>
                      {sp}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 9. Sweet Preference */}
              <Text style={styles.surveyQuestion}>9. Sweet Preference & Desserts?</Text>
              <View style={styles.chipGrid}>
                {['Low Sugar / No Desserts 🍃', 'Moderate Sweet Tooth 🍯', 'High Dessert Lover 🍰'].map((sw) => (
                  <Pressable
                    key={sw}
                    style={[styles.surveyChip, sweet === sw && styles.surveyChipActive]}
                    onPress={() => setSweet(sw)}
                  >
                    <Text style={[styles.surveyChipText, sweet === sw && styles.surveyChipTextActive]}>
                      {sw}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 10. Budget */}
              <Text style={styles.surveyQuestion}>10. Preferred Budget Range per Meal?</Text>
              <View style={styles.chipGrid}>
                {['Under ₹200 (₹)', '₹200 – ₹400 per meal (₹₹)', 'Above ₹400 (₹₹₹)'].map((b) => (
                  <Pressable
                    key={b}
                    style={[styles.surveyChip, budget === b && styles.surveyChipActive]}
                    onPress={() => setBudget(b)}
                  >
                    <Text style={[styles.surveyChipText, budget === b && styles.surveyChipTextActive]}>
                      {b}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Continue to Swiper */}
              <Pressable
                style={styles.continueSwiperBtn}
                onPress={() => setSurveyStep(1)}
              >
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.continueSwiperText}>Continue to Visual Taste Profiler</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brandIcon}>🍴</Text>
            <Text style={styles.brandName}>FoodWise AI</Text>
          </View>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Visual Appetite Test</Text>
            <Text style={styles.headerSub}>
              Rate dishes visually — our CNN extracts your taste profile.
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${prog}%` as any }]} />
            </View>
            <Text style={styles.progressText}>{currentIndex + 1} / {cards.length}</Text>
          </View>
        </View>

        {/* Card */}
        <View style={styles.cardArea}>
          <View style={[styles.card, { borderColor: accent }]}>

            {/* Image */}
            <View style={styles.cardImageWrap}>
              {(card.image_url || card.img) ? (
                <Image
                  source={{ uri: card.image_url
                    ? `${rawBaseUrl}${card.image_url}`
                    : IMG(card.img!)
                  }}
                  style={styles.cardImage}
                />
              ) : (
                <View style={[styles.cardImage, styles.cardEmojiWrap, { backgroundColor: accent + '18' }]}>
                  <Text style={styles.cardEmoji}>{card.image_emoji}</Text>
                </View>
              )}
              {/* Category badge */}
              <View style={[styles.catBadge, { borderColor: accent }]}>
                <Text style={[styles.catBadgeText, { color: accent }]}>
                  {card.category.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.cardBody}>
              <View>
                <Text style={styles.dishName}>{card.name}</Text>
                <Text style={styles.restaurantName}>from {card.restaurant}</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>₹{card.price}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F39C12" />
                  <Text style={styles.ratingText}>{card.rating}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Swipe buttons */}
        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [styles.passBtn, pressed && { opacity: 0.8 }]}
            onPress={() => handleSwipe(false)}
          >
            <Text style={styles.passBtnIcon}>✕</Text>
            <Text style={styles.passBtnLabel}>PASS</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.yumBtn, { borderColor: accent, backgroundColor: accent + '15' }, pressed && { opacity: 0.8 }]}
            onPress={() => handleSwipe(true)}
          >
            <Text style={styles.yumBtnIcon}>❤</Text>
            <Text style={[styles.yumBtnLabel, { color: accent }]}>YUM!</Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ── Fallback cards with real images ──────────────────────────
const FALLBACK_CARDS: ProfilerCard[] = [
  { id: 1,  name: 'Paneer Butter Masala',      restaurant: 'Punjabi Rasoi',         price: 240, rating: 4.6, category: 'Indian',    image_emoji: '🍲', img: 'dish_1.jpg'   },
  { id: 4,  name: 'Quinoa Avocado Salad',       restaurant: 'The Green Bowl',         price: 290, rating: 4.8, category: 'Healthy',   image_emoji: '🥗', img: 'dish_12.jpeg' },
  { id: 7,  name: 'Margherita Woodfired Pizza', restaurant: 'Toscano Pizzeria',       price: 380, rating: 4.5, category: 'Italian',   image_emoji: '🍕', img: 'dish_15.jpeg' },
  { id: 12, name: 'Triple Chocolate Brownie',   restaurant: 'Sweet Tooth Patisserie', price: 120, rating: 4.9, category: 'Desserts',  image_emoji: '🍰', img: 'dish_2.webp'  },
  { id: 10, name: 'Double Cheese Burger',        restaurant: 'Burger House',           price: 180, rating: 4.3, category: 'Fast Food', image_emoji: '🍔', img: 'dish_18.jpg'  },
  { id: 14, name: 'Paneer Tikka Skewers',        restaurant: 'Grill Station',          price: 260, rating: 4.6, category: 'Indian',    image_emoji: '🔥', img: 'dish_4.png'   },
  { id: 15, name: 'Chicken Curry Kadai',         restaurant: 'Spice Route',            price: 220, rating: 4.5, category: 'Indian',    image_emoji: '🍗', img: 'dish_7.jpeg'  },
  { id: 2,  name: 'Chicken Dum Biryani',         restaurant: 'Biryani Zone',           price: 280, rating: 4.7, category: 'Indian',    image_emoji: '🍚', img: 'dish_10.jpeg' },
];


const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Surface.white,
  },
  safe: {
    flex:             1,
    paddingHorizontal: Spacing.four,
    paddingBottom:    Spacing.four,
  },

  // Loading
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.two,
    backgroundColor:Surface.white,
    padding:        Spacing.four,
  },
  loadingTitle: {
    fontSize:   18,
    fontWeight: '700',
    color:      Brand.primary,
    textAlign:  'center',
  },
  loadingSub: {
    fontSize:  12,
    color:     TextColors.muted,
    textAlign: 'center',
    lineHeight:18,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop:  Spacing.three,
    gap:         Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  brandIcon: { fontSize: 18 },
  brandName: {
    fontSize:   18,
    fontWeight: '900',
    color:      Brand.primary,
  },
  headerCenter: {
    alignItems: 'center',
    gap:         4,
  },
  headerTitle: {
    fontSize:   22,
    fontWeight: '900',
    color:      TextColors.heading,
  },
  headerSub: {
    fontSize:  12,
    color:     TextColors.muted,
    textAlign: 'center',
    lineHeight:17,
    maxWidth:  300,
  },
  progressWrap: {
    width:         '100%',
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
    marginTop:     Spacing.one,
  },
  progressTrack: {
    flex:            1,
    height:          6,
    backgroundColor: Surface.bg,
    borderRadius:    3,
    overflow:        'hidden',
  },
  progressFill: {
    height:          '100%',
    backgroundColor: Brand.primary,
    borderRadius:    3,
  },
  progressText: {
    fontSize:   11,
    fontWeight: '700',
    color:      TextColors.muted,
  },

  // Card
  cardArea: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: Spacing.three,
  },
  card: {
    width:           CARD_W,
    height:          CARD_H,
    backgroundColor: Surface.white,
    borderRadius:    Radius.xl,
    borderWidth:     1.5,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.06,
    shadowRadius:    20,
    elevation:       6,
  },
  cardImageWrap: {
    height:          260,
    position:        'relative',
  },
  cardImage: {
    width:     '100%',
    height:    '100%',
    resizeMode:'cover',
  },
  cardEmojiWrap: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 90 },
  catBadge: {
    position:        'absolute',
    top:             12,
    left:            12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth:     1,
    borderRadius:    Radius.full,
    paddingHorizontal:12,
    paddingVertical:   5,
  },
  catBadgeText: {
    fontSize:      9,
    fontWeight:    '800',
    letterSpacing: 1,
  },
  cardBody: {
    flex:    1,
    padding: Spacing.four,
    justifyContent:'space-between',
  },
  dishName: {
    fontSize:   24,
    fontWeight: '900',
    color:      TextColors.heading,
  },
  restaurantName: {
    fontSize:  13,
    color:     TextColors.muted,
    marginTop:  3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
  },
  priceBadge: {
    backgroundColor: Brand.primaryLight,
    borderRadius:    Radius.full,
    paddingHorizontal:12,
    paddingVertical:   6,
  },
  priceText: {
    fontSize:   16,
    fontWeight: '800',
    color:      Brand.primary,
  },
  ratingBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: '#FFF8E7',
    borderRadius:    Radius.full,
    paddingHorizontal:10,
    paddingVertical:   6,
  },
  ratingText: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#B7860C',
  },

  // Buttons
  btnRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            Spacing.five,
    paddingBottom:  Spacing.three,
  },
  passBtn: {
    alignItems:      'center',
    justifyContent:  'center',
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: Surface.white,
    borderWidth:     1.5,
    borderColor:     '#FFB3B3',
    shadowColor:     '#000',
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
  },
  passBtnIcon: {
    fontSize:   22,
    color:      '#E74C3C',
    lineHeight: 26,
  },
  passBtnLabel: {
    fontSize:      8,
    fontWeight:    '800',
    color:         '#E74C3C',
    letterSpacing: 1,
    marginTop:     2,
  },
  yumBtn: {
    alignItems:      'center',
    justifyContent:  'center',
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: Surface.white,
    borderWidth:     1.5,
    shadowColor:     '#000',
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
  },
  yumBtnIcon: {
    fontSize:   22,
    lineHeight: 26,
  },
  yumBtnLabel: {
    fontSize:      8,
    fontWeight:    '800',
    letterSpacing: 1,
    marginTop:     2,
  },

  // Survey Styles
  surveyScroll: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  surveyBox: {
    width: isWeb ? 600 : '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: 12,
    borderWidth: 1,
    borderColor: Surface.border,
  },
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  surveyTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Brand.primary,
    letterSpacing: 0.6,
  },
  surveyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: TextColors.heading,
  },
  surveyQuestion: {
    fontSize: 14,
    fontWeight: '800',
    color: TextColors.heading,
    marginTop: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  surveyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Surface.bg,
    borderWidth: 1,
    borderColor: Surface.border,
  },
  surveyChipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  surveyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TextColors.body,
  },
  surveyChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  continueSwiperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    marginTop: 20,
  },
  continueSwiperText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
