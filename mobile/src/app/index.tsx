/**
 * FoodWiseAI — Home Screen
 *
 * Two modes:
 *  • No taste profile → Landing Page (hero + features + footer)
 *  • Has taste profile → Dashboard (sidebar + AI picks + trending + macros)
 *
 * ALL dish images pulled from /static/images/dishes/ on the backend.
 */
import React, { useState, useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Text,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Brand, Surface, TextColors, Status, Radius, Spacing, BottomTabInset,
} from '@/constants/theme';
import api, { rawBaseUrl } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';

const isWeb = Platform.OS === 'web';

// ── Dish image helper ─────────────────────────────────────────
const IMG = (filename: string) => {
  if (!filename) return `${rawBaseUrl}/dataset/images.jpeg`;
  if (filename.startsWith('/dataset/') || filename.startsWith('/static/')) {
    return `${rawBaseUrl}${filename}`;
  }
  return `${rawBaseUrl}/dataset/${filename}`;
};

// ── Full seeded catalog matching all 20 dataset files ────────
const ALL_DISHES = [
  { id: 1,  name: 'Chicken Lollipop Drums',     restaurant: 'Spice Station',         price: 260, rating: 4.8, category: 'Indian',    img: 'best_chicken_lollipop_drums_of_chicken-500x500.jpg', kcal: 450, protein: 32, match: 98, reason: 'High visual similarity to spicy chicken appetizer embeddings.' },
  { id: 2,  name: 'Spicy Chicken Lollipop',      restaurant: 'Asian Wok & Grill',     price: 270, rating: 4.7, category: 'Fast Food', img: 'chicken-lollipop-1-500x500.webp',                   kcal: 430, protein: 28, match: 96, reason: 'Crispy glazed drumstick pattern matches your swipe preferences.' },
  { id: 3,  name: 'Crispy Chicken Lollipops',    restaurant: 'The Sizzler House',     price: 250, rating: 4.6, category: 'Fast Food', img: 'chicken-lollipop-480x270.jpg',                     kcal: 410, protein: 26, match: 94, reason: 'Sizzling fried chicken texture matches dimension 40-55.' },
  { id: 4,  name: 'Paneer Tikka Skewers',       restaurant: 'Grill Station',         price: 240, rating: 4.6, category: 'Indian',    img: 'image-358.png',                                       kcal: 390, protein: 24, match: 93, reason: 'Grilled paneer visual texture vectors — strong match to your Indian profile.' },
  { id: 5,  name: 'Gourmet Chicken Bowl',        restaurant: 'Healthy Bytes',         price: 290, rating: 4.5, category: 'Healthy',   img: 'images (1).jpeg',                                     kcal: 380, protein: 34, match: 91, reason: 'Lean protein source — cosine similarity 0.91 to your health vector.' },
  { id: 6,  name: 'Chef Special Curry',          restaurant: 'Punjabi Rasoi',         price: 230, rating: 4.4, category: 'Indian',    img: 'images (2).jpeg',                                     kcal: 420, protein: 18, match: 90, reason: 'Rich tomato gravy texture matches your Indian spice profile.' },
  { id: 7,  name: 'Crispy Samosa Platter',       restaurant: 'Street Bites',          price: 140, rating: 4.3, category: 'Fast Food', img: 'images (3).jpeg',                                     kcal: 320, protein: 8,  match: 86, reason: 'Gold fried pastry visual features match snack profile.' },
  { id: 8,  name: 'Masala Dosa Supreme',         restaurant: 'South Express',         price: 160, rating: 4.7, category: 'Indian',    img: 'images (4).jpeg',                                     kcal: 340, protein: 10, match: 89, reason: 'Crispy crepe texture embedding matches South Indian cluster.' },
  { id: 9,  name: 'Veg Biryani Special',         restaurant: 'Royal Biryani House',   price: 200, rating: 4.4, category: 'Indian',    img: 'images (5).jpeg',                                     kcal: 460, protein: 12, match: 87, reason: 'Biryani visual cluster match — basmati rice texture features align.' },
  { id: 10, name: 'Tandoori Roti Basket',        restaurant: 'The Dhaba',             price: 120, rating: 4.2, category: 'Indian',    img: 'images (6).jpeg',                                     kcal: 260, protein: 8,  match: 83, reason: 'Baked flatbread visual features match Indian bread cluster.' },
  { id: 11, name: 'Chicken Curry Kadai',         restaurant: 'Spice Route',           price: 220, rating: 4.5, category: 'Indian',    img: 'images (7).jpeg',                                     kcal: 440, protein: 36, match: 92, reason: 'Spiced gravy & chicken visual embedding match at dimension 82-95.' },
  { id: 12, name: 'Creamy Shahi Paneer',         restaurant: 'The Royal Feast',       price: 250, rating: 4.6, category: 'Indian',    img: 'images (8).jpeg',                                     kcal: 410, protein: 20, match: 88, reason: 'Creamy curd & cottage cheese feature maps align with Indian profile.' },
  { id: 13, name: 'Dal Tadka Combo',             restaurant: 'Desi Kitchen',          price: 180, rating: 4.3, category: 'Indian',    img: 'images (9).jpeg',                                     kcal: 310, protein: 14, match: 85, reason: 'Lentil soup visual embedding matches comfort food cluster.' },
  { id: 14, name: 'Chicken Dum Biryani',        restaurant: 'Biryani Zone',          price: 280, rating: 4.7, category: 'Indian',    img: 'images (10).jpeg',                                    kcal: 510, protein: 32, match: 94, reason: 'Deep visual similarity to your 5 previous spiced-rice order embeddings.' },
  { id: 15, name: 'Butter Naan & Dal Makhani',  restaurant: 'The Dhaba',             price: 190, rating: 4.4, category: 'Indian',    img: 'images (11).jpeg',                                    kcal: 380, protein: 14, match: 88, reason: 'Matches creamy-gravy & bread texture vectors in your taste profile.' },
  { id: 16, name: 'Gulab Jamun Sundae',         restaurant: 'Sweet Tooth Patisserie',price: 120, rating: 4.9, category: 'Desserts', img: 'images.jpeg',                                          kcal: 380, protein: 6,  match: 88, reason: 'Your top dessert — visual feature cosine similarity 0.88 to dessert cluster.' },
  { id: 17, name: 'Double Cheese Burger',        restaurant: 'Burger House',          price: 180, rating: 4.3, category: 'Fast Food', img: 'istockphoto-1410130688-612x612.jpg',                kcal: 680, protein: 28, match: 75, reason: 'Matches your evening fast-food ordering time-pattern.' },
  { id: 18, name: 'Loaded Peri Peri Fries',      restaurant: 'The Fry Express',       price: 150, rating: 4.2, category: 'Fast Food', img: 'istockphoto-1453499717-612x612.jpg',                kcal: 430, protein: 8,  match: 70, reason: 'Frequently ordered as a side — meal pattern correlation 0.82.' },
  { id: 19, name: 'Gourmet Food Feast',         restaurant: 'Grand Bistro',          price: 350, rating: 4.8, category: 'Healthy',   img: 'maxresdefault.jpg',                                   kcal: 520, protein: 38, match: 92, reason: 'Rich multi-course platter visual feature array matches high-protein target.' },
  { id: 20, name: 'Italian Pizza with Olives',  restaurant: 'Toscano Pizzeria',      price: 380, rating: 4.8, category: 'Italian',   img: 'pizza-with-olives-tomatoes-olives-it_1268410-858.avif', kcal: 560, protein: 20, match: 95, reason: 'Woodfired pizza crust & olive topping embeddings match Italian dims 0-15.' },
];

const CATEGORIES = [
  { label: 'All',       icon: '🍽️' },
  { label: 'Indian',    icon: '🍛' },
  { label: 'Healthy',   icon: '🥗' },
  { label: 'Italian',   icon: '🍕' },
  { label: 'Fast Food', icon: '🍔' },
  { label: 'Desserts',  icon: '🍰' },
];

const RECENT_PICKS = [
  { name: 'Paneer Tikka Skewers',  when: 'Yesterday • Dinner',  img: 'dish_4.png'   },
  { name: 'Chicken Dum Biryani',   when: 'Tuesday • Lunch',     img: 'dish_10.jpeg' },
  { name: 'Quinoa Avocado Salad',  when: 'Monday • Breakfast',  img: 'dish_12.jpeg' },
];

const FEATURES = [
  {
    icon: '🔍', title: 'AI-Driven Discovery',
    description: 'Uncover hidden culinary gems precisely tailored to your taste profile and macro requirements via CNN visual embeddings.',
  },
  {
    icon: '🎯', title: 'Health-Goal Alignment',
    description: 'Whether it\'s muscle gain, weight loss, or metabolic health, our models adapt recommendations in real-time.',
  },
  {
    icon: '💰', title: 'Budget-Friendly Picks',
    description: 'AI identifies the most cost-effective sources of quality nutrients without compromising on taste.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
import MealOrderModal, { DishDetails } from '@/components/meal-order-modal';

export default function HomeScreen() {
  const router  = useRouter();
  const { tasteRecommendations, userVectorSummary, resetProfile } = useAppStore();

  const [backendOnline, setBackendOnline] = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [selectedCat,   setSelectedCat]   = useState('All');
  const [totalOrders,   setTotalOrders]   = useState(12);
  const [selectedOrderDish, setSelectedOrderDish] = useState<DishDetails | null>(null);

  useEffect(() => {
    api.get('/health')
      .then(r => { if (r.data?.status === 'healthy') setBackendOnline(true); })
      .catch(() => {});
  }, []);

  const hasProfile = tasteRecommendations.length > 0;

  // Merge API recs with local metadata for display
  const getDisplayRecs = () => {
    if (tasteRecommendations.length > 0) {
      return tasteRecommendations.map((r: any) => {
        const local = ALL_DISHES.find(d => d.id === r.id);
        return { ...r, ...local, image_url: local?.img ? `/dataset/${local.img}` : r.image_url };
      });
    }
    return ALL_DISHES;
  };

  const allRecs = getDisplayRecs();

  const filtered = allRecs.filter((item: any) => {
    const q   = searchQuery.toLowerCase();
    const cat = selectedCat === 'All' || item.category === selectedCat;
    const srch = !q || item.name.toLowerCase().includes(q) || item.restaurant.toLowerCase().includes(q);
    return cat && srch;
  });

  const handleOrder = (item: any) => {
    setSelectedOrderDish(item);
  };

  // ── LANDING PAGE ─────────────────────────────────────────────
  if (!hasProfile) {
    return <LandingPage onStart={() => router.push('/profiler')} />;
  }

  // ── DASHBOARD ────────────────────────────────────────────────
  const heroItem = allRecs[0];

  return (
    <View style={styles.root}>
      {isWeb && <Sidebar />}
      <View style={styles.mainArea}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>

          {/* Top row */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.greeting}>Hello, <Text style={styles.greetingAccent}>Alex!</Text></Text>
              <Text style={styles.greetingSub}>Here's what's cooking for you today.</Text>
            </View>
            <View style={styles.topRight}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={15} color={TextColors.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Ask AI for meal ideas..."
                  placeholderTextColor={TextColors.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <View style={[styles.statusDot, { backgroundColor: backendOnline ? '#2ECC71' : '#E74C3C' }]} />
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.bodyRow}>

              {/* ── Left column ── */}
              <View style={styles.leftCol}>

                {/* AI Choice of the Day — hero card */}
                <Text style={styles.sectionTitle}><Text style={{ color: Brand.orange }}>✦ </Text>AI Choice of the Day</Text>
                <View style={styles.heroCard}>
                  <Image source={{ uri: IMG(heroItem.img) }} style={styles.heroImage} />
                  <View style={styles.heroOverlay} />
                  {/* Match badge */}
                  <View style={styles.heroBadge}>
                    <View style={styles.heroBadgeDot} />
                    <Text style={styles.heroBadgeText}>{heroItem.match}% Match</Text>
                  </View>
                  {/* Content */}
                  <View style={styles.heroContent}>
                    <Text style={styles.heroName}>{heroItem.name}</Text>
                    <View style={styles.heroTags}>
                      <View style={styles.heroTag}><Text style={styles.heroTagText}>{heroItem.category}</Text></View>
                      <View style={styles.heroTag}><Text style={styles.heroTagText}>{heroItem.kcal} kcal</Text></View>
                      <View style={styles.heroTag}><Text style={styles.heroTagText}>{heroItem.protein}g Protein</Text></View>
                    </View>
                    <View style={styles.heroReason}>
                      <Text style={styles.heroReasonLabel}>Why it fits: </Text>
                      <Text style={styles.heroReasonText} numberOfLines={2}>{heroItem.reason}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.heroBtn} onPress={() => handleOrder(heroItem)}>
                    <Text style={styles.heroBtnText}>Order Now</Text>
                  </Pressable>
                </View>

                {/* Category filter pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.catRow}>
                    {CATEGORIES.map(cat => (
                      <Pressable
                        key={cat.label}
                        style={[styles.catPill, selectedCat === cat.label && styles.catPillActive]}
                        onPress={() => setSelectedCat(cat.label)}
                      >
                        <Text style={styles.catIcon}>{cat.icon}</Text>
                        <Text style={[styles.catLabel, selectedCat === cat.label && styles.catLabelActive]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* CNN Personalized Feed */}
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>CNN Personalized Picks</Text>
                  <Text style={styles.countBadge}>{filtered.length} items</Text>
                </View>

                <View style={styles.feedGrid}>
                  {filtered.map((item: any, i: number) => (
                    <Pressable key={item.id} style={styles.feedCard} onPress={() => handleOrder(item)}>
                      {/* Image */}
                      <View style={styles.feedImageWrap}>
                        <Image source={{ uri: IMG(item.img) }} style={styles.feedImage} />
                        {/* Match overlay */}
                        <View style={styles.feedMatchBadge}>
                          <Text style={styles.feedMatchText}>{item.match}%</Text>
                        </View>
                        {/* Price */}
                        <View style={styles.feedPriceBadge}>
                          <Text style={styles.feedPriceText}>₹{item.price}</Text>
                        </View>
                      </View>

                      {/* Body */}
                      <View style={styles.feedBody}>
                        <View style={styles.feedTopRow}>
                          <View style={styles.catChip}>
                            <Text style={styles.catChipText}>{item.category}</Text>
                          </View>
                          <View style={styles.ratingChip}>
                            <Ionicons name="star" size={10} color="#F39C12" />
                            <Text style={styles.ratingText}>{item.rating}</Text>
                          </View>
                        </View>
                        <Text style={styles.feedName}>{item.name}</Text>
                        <Text style={styles.feedRestaurant}>by {item.restaurant}</Text>
                        {/* CNN reason */}
                        <View style={styles.feedReason}>
                          <Text style={styles.feedReasonText} numberOfLines={2}>💡 {item.reason}</Text>
                        </View>
                        {/* Macro strip */}
                        <View style={styles.macroStrip}>
                          <View style={styles.macroChip}>
                            <View style={[styles.macroDot, { backgroundColor: Status.protein }]} />
                            <Text style={styles.macroChipText}>{item.protein}g protein</Text>
                          </View>
                          <View style={styles.macroChip}>
                            <View style={[styles.macroDot, { backgroundColor: Status.carbs }]} />
                            <Text style={styles.macroChipText}>{item.kcal} kcal</Text>
                          </View>
                        </View>
                        {/* Order */}
                        <Pressable style={i === 0 ? styles.orderBtnPrimary : styles.orderBtnOutline}>
                          <Text style={i === 0 ? styles.orderBtnTextPrimary : styles.orderBtnTextOutline}>
                            Order Dish
                          </Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}
                </View>

              </View>

              {/* ── Right column (web only) ── */}
              {isWeb && (
                <View style={styles.rightCol}>

                  {/* Daily Macros */}
                  <View style={styles.sideCard}>
                    <Text style={styles.sideCardTitle}>Daily Macros</Text>
                    <Text style={styles.sideCardSub}>1,240 / 2,100 kcal consumed</Text>
                    {[
                      { label: 'Protein', curr: 80, goal: 140, color: Status.protein },
                      { label: 'Carbs',   curr: 120, goal: 220, color: Status.carbs  },
                      { label: 'Fats',    curr: 45,  goal: 65,  color: Status.fats   },
                    ].map(m => (
                      <View key={m.label} style={styles.macroRow}>
                        <View style={styles.macroLabelRow}>
                          <Text style={styles.macroLabel}>{m.label}</Text>
                          <Text style={styles.macroValues}>{m.curr}g / {m.goal}g</Text>
                        </View>
                        <View style={styles.macroTrack}>
                          <View style={[styles.macroFill, { width: `${Math.round((m.curr / m.goal) * 100)}%` as any, backgroundColor: m.color }]} />
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Recent AI Picks */}
                  <View style={styles.sideCard}>
                    <View style={styles.sideCardHeader}>
                      <Ionicons name="time-outline" size={14} color={TextColors.muted} />
                      <Text style={styles.sideCardTitle}>Recent AI Picks</Text>
                    </View>
                    {RECENT_PICKS.map((p, i) => (
                      <View key={i} style={styles.recentItem}>
                        <Image source={{ uri: IMG(p.img) }} style={styles.recentImage} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recentName}>{p.name}</Text>
                          <Text style={styles.recentWhen}>{p.when}</Text>
                        </View>
                        <Pressable style={styles.reorderBtn}>
                          <Text style={styles.reorderText}>Reorder</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>

                  {/* CNN Status mini card */}
                  <View style={[styles.sideCard, { backgroundColor: Brand.primaryLight, borderColor: Brand.primaryBorder }]}>
                    <View style={styles.sideCardHeader}>
                      <View style={[styles.statusDot, { backgroundColor: '#2ECC71' }]} />
                      <Text style={[styles.sideCardTitle, { color: Brand.primary }]}>CNN Engine Active</Text>
                    </View>
                    <Text style={styles.cnnStatusText}>128-D visual vector • {totalOrders} training signals processed</Text>
                    <Pressable style={styles.resetBtn} onPress={resetProfile}>
                      <Text style={styles.resetBtnText}>Reset Taste Profile</Text>
                    </Pressable>
                  </View>

                  {/* Upgrade CTA */}
                  <Pressable style={styles.upgradeCard}>
                    <Text style={styles.upgradeText}>🚀 Upgrade to Pro</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Meal Order Modal */}
      {selectedOrderDish && (
        <MealOrderModal
          dish={selectedOrderDish}
          visible={!!selectedOrderDish}
          onClose={() => setSelectedOrderDish(null)}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing Page
// ─────────────────────────────────────────────────────────────────────────────
function LandingPage({ onStart }: { onStart: () => void }) {
  // Pick 3 hero dishes for the preview grid
  const heroDishes = [
    ALL_DISHES.find(d => d.id === 14)!,
    ALL_DISHES.find(d => d.id === 4)!,
    ALL_DISHES.find(d => d.id === 2)!,
  ];

  return (
    <ScrollView style={lp.root}>

      {/* Hero */}
      <View style={lp.hero}>
        <View style={lp.heroLeft}>
          <View style={lp.aiBadge}>
            <Text style={lp.aiBadgeText}>✦  AI-POWERED NUTRITION</Text>
          </View>
          <Text style={lp.h1}>
            Personalized Food{'\n'}Choices,{'\n'}
            <Text style={lp.h1Accent}>Smarter Every Time.</Text>
          </Text>
          <Text style={lp.heroSub}>
            Experience the future of eating. Our CNN analyzes your unique visual taste
            profile to curate premium, delicious, and goal-aligned meal recommendations instantly.
          </Text>
          <View style={lp.heroBtns}>
            <Pressable style={lp.btnPrimary} onPress={onStart}>
              <Text style={lp.btnPrimaryText}>Get Started  →</Text>
            </Pressable>
            <Pressable style={lp.btnOutline}>
              <Text style={lp.btnOutlineText}>▶  See How It Works</Text>
            </Pressable>
          </View>
        </View>

        {/* Real food image grid */}
        <View style={lp.heroRight}>
          <Image source={{ uri: IMG(heroDishes[0].img) }} style={lp.heroMainImg} />
          {/* AI match chip */}
          <View style={lp.matchChip}>
            <Text style={lp.matchChipIcon}>📊</Text>
            <View>
              <Text style={lp.matchChipLabel}>AI MATCH SCORE</Text>
              <Text style={lp.matchChipValue}>{heroDishes[0].match}% Perfect Match</Text>
            </View>
            <Text style={lp.matchChipProtein}>Protein: {heroDishes[0].protein}g</Text>
          </View>
        </View>
      </View>

      {/* Previous Orders → CNN → Recommendations section */}
      <View style={lp.cnnSection}>
        <Text style={lp.cnnTitle}>How Our CNN Learns From Your Orders</Text>
        <Text style={lp.cnnSub}>
          Our Convolutional Neural Network analyzes the visual features of your previous orders —
          textures, colors, composition — to build a 128-dimensional taste vector unique to you.
        </Text>

        <View style={lp.cnnFlow}>
          {/* Previous orders */}
          <View style={lp.cnnStep}>
            <Text style={lp.cnnStepLabel}>📦 Previous Orders</Text>
            <View style={lp.cnnImgRow}>
              {heroDishes.map(d => (
                <View key={d.id} style={lp.cnnSmallImgWrap}>
                  <Image source={{ uri: IMG(d.img) }} style={lp.cnnSmallImg} />
                  <Text style={lp.cnnSmallLabel} numberOfLines={1}>{d.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Arrow */}
          <View style={lp.cnnArrow}>
            <Text style={lp.cnnArrowIcon}>→</Text>
            <View style={lp.cnnEngineBox}>
              <Text style={lp.cnnEngineIcon}>🧠</Text>
              <Text style={lp.cnnEngineLabel}>CNN{'\n'}Feature{'\n'}Extractor</Text>
              <Text style={lp.cnnEngineSub}>128-D{'\n'}Vector</Text>
            </View>
            <Text style={lp.cnnArrowIcon}>→</Text>
          </View>

          {/* Recommendations */}
          <View style={lp.cnnStep}>
            <Text style={lp.cnnStepLabel}>✦ Recommendations</Text>
            <View style={lp.cnnImgRow}>
              {ALL_DISHES.slice(0, 3).map(d => (
                <View key={d.id} style={lp.cnnSmallImgWrap}>
                  <Image source={{ uri: IMG(d.img) }} style={lp.cnnSmallImg} />
                  <View style={lp.cnnMatchOverlay}>
                    <Text style={lp.cnnMatchText}>{d.match}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Features */}
      <View style={lp.features}>
        <Text style={lp.featTitle}>Intelligent Features for Better Eating</Text>
        <Text style={lp.featSub}>
          Beyond simple calorie counting, FoodWise AI understands the complex nutritional
          matrix to optimize your daily intake.
        </Text>
        <View style={lp.featCards}>
          {FEATURES.map(f => (
            <View key={f.title} style={lp.featCard}>
              <View style={lp.featIconWrap}><Text style={{ fontSize: 26 }}>{f.icon}</Text></View>
              <Text style={lp.featTitle2}>{f.title}</Text>
              <Text style={lp.featDesc}>{f.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Sample dishes preview */}
      <View style={lp.dishPreview}>
        <Text style={lp.dishPreviewTitle}>Dishes Waiting for You</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={lp.dishScroll}>
          {ALL_DISHES.slice(0, 8).map(d => (
            <View key={d.id} style={lp.dishThumb}>
              <Image source={{ uri: IMG(d.img) }} style={lp.dishThumbImg} />
              <View style={lp.dishThumbBody}>
                <Text style={lp.dishThumbName} numberOfLines={1}>{d.name}</Text>
                <Text style={lp.dishThumbMeta}>{d.restaurant}</Text>
                <View style={lp.dishThumbFooter}>
                  <Text style={lp.dishThumbPrice}>₹{d.price}</Text>
                  <View style={lp.dishThumbMatch}>
                    <Text style={lp.dishThumbMatchText}>{d.match}% match</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* CTA Banner */}
      <View style={lp.ctaBanner}>
        <Text style={lp.ctaBannerTitle}>Ready to taste the future?</Text>
        <Text style={lp.ctaBannerSub}>Take the visual taste test — 2 minutes to train your personal CNN model.</Text>
        <Pressable style={lp.ctaBannerBtn} onPress={onStart}>
          <Text style={lp.ctaBannerBtnText}>Start Visual Appetite Test →</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={lp.footer}>
        <View>
          <Text style={lp.footerBrand}>FoodWise AI</Text>
          <Text style={lp.footerCopy}>© 2024 FoodWise AI. Precision Nutrition Powered by Intelligence.</Text>
        </View>
        {isWeb && (
          <View style={lp.footerLinks}>
            {['Privacy Policy', 'Terms of Service', 'API Docs', 'Contact Support'].map(l => (
              <Pressable key={l}><Text style={lp.footerLink}>{l}</Text></Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: Surface.bg },
  mainArea: { flex: 1 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    backgroundColor: Surface.white, borderBottomWidth: 1, borderBottomColor: Surface.border,
  },
  greeting:      { fontSize: 24, fontWeight: '900', color: TextColors.heading },
  greetingAccent:{ color: Brand.orange },
  greetingSub:   { fontSize: 12, color: TextColors.muted, marginTop: 2 },
  topRight:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Surface.inputBg, borderRadius: Radius.full,
    paddingHorizontal: Spacing.three, paddingVertical: 8,
    gap: 8, minWidth: isWeb ? 240 : 150,
    borderWidth: 1, borderColor: Surface.border,
  },
  searchInput:   { flex: 1, fontSize: 13, color: TextColors.body, outlineStyle: 'none' as any },
  statusDot:     { width: 10, height: 10, borderRadius: 5 },
  scroll:        { padding: Spacing.four, paddingBottom: BottomTabInset + Spacing.four },
  bodyRow:       { flexDirection: isWeb ? 'row' : 'column', gap: Spacing.four, alignItems: 'flex-start' },
  leftCol:       { flex: isWeb ? 1 : undefined, gap: Spacing.four },
  rightCol:      { width: isWeb ? 280 : undefined, gap: Spacing.three },
  sectionTitle:  { fontSize: 18, fontWeight: '800', color: TextColors.heading },
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countBadge: {
    backgroundColor: Brand.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },

  // Hero card
  heroCard: {
    height: isWeb ? 340 : 270, borderRadius: Radius.xl,
    overflow: 'hidden', position: 'relative', backgroundColor: '#111',
  },
  heroImage:     { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  heroBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  heroBadgeDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.primary },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: Brand.primary },
  heroContent:   { position: 'absolute', bottom: 68, left: 16, right: 100 },
  heroName:      { fontSize: 22, fontWeight: '900', color: '#FFF', lineHeight: 28 },
  heroTags:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroTagText:   { color: '#FFF', fontSize: 10, fontWeight: '600' },
  heroReason: {
    flexDirection: 'row', flexWrap: 'wrap', marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: Radius.sm, padding: 8,
  },
  heroReasonLabel:{ color: Brand.orange, fontSize: 11, fontWeight: '700' },
  heroReasonText: { color: '#FFF', fontSize: 11, flex: 1, lineHeight: 16 },
  heroBtn: {
    position: 'absolute', bottom: 16, right: 16,
    backgroundColor: Brand.primary, borderRadius: Radius.sm,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  heroBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // Categories
  catRow:        { flexDirection: 'row', gap: Spacing.two, paddingVertical: 4 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: Spacing.three,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Surface.border,
    backgroundColor: Surface.white,
  },
  catPillActive: { backgroundColor: Brand.primaryLight, borderColor: Brand.primaryBorder },
  catIcon:       { fontSize: 16 },
  catLabel:      { fontSize: 12, color: TextColors.muted, fontWeight: '600' },
  catLabelActive:{ color: Brand.primary, fontWeight: '700' },

  // Feed grid
  feedGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: isWeb ? 'wrap' : 'nowrap',
    gap: Spacing.three,
  },
  feedCard: {
    backgroundColor: Surface.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Surface.border,
    overflow: 'hidden',
    width: isWeb ? '31%' : '100%',
    minWidth: isWeb ? 300 : undefined,
  },
  feedImageWrap: { height: 190, position: 'relative' },
  feedImage:     { width: '100%', height: '100%', resizeMode: 'cover' },
  feedMatchBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  feedMatchText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  feedPriceBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: Surface.white,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  feedPriceText: { fontSize: 12, fontWeight: '800', color: TextColors.heading },
  feedBody:      { padding: Spacing.three, gap: Spacing.one },
  feedTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catChip: {
    backgroundColor: Brand.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  catChipText:   { fontSize: 9, fontWeight: '700', color: Brand.primary },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF8E7', borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  ratingText:    { fontSize: 10, fontWeight: '700', color: '#B7860C' },
  feedName:      { fontSize: 16, fontWeight: '800', color: TextColors.heading, marginTop: 4 },
  feedRestaurant:{ fontSize: 11, color: TextColors.muted },
  feedReason: {
    backgroundColor: Surface.bg, borderRadius: Radius.sm,
    padding: 8, marginTop: 6,
  },
  feedReasonText:{ fontSize: 10, color: TextColors.body, lineHeight: 15 },
  macroStrip:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  macroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Surface.bg, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  macroDot:      { width: 6, height: 6, borderRadius: 3 },
  macroChipText: { fontSize: 9, color: TextColors.muted, fontWeight: '600' },
  orderBtnPrimary: {
    backgroundColor: Brand.primary, borderRadius: Radius.sm,
    paddingVertical: 11, alignItems: 'center', marginTop: 8,
  },
  orderBtnTextPrimary:{ color: '#FFF', fontWeight: '700', fontSize: 14 },
  orderBtnOutline: {
    borderWidth: 1.5, borderColor: Surface.border, borderRadius: Radius.sm,
    paddingVertical: 11, alignItems: 'center', marginTop: 8,
  },
  orderBtnTextOutline:{ color: TextColors.heading, fontWeight: '700', fontSize: 14 },

  // Right column
  sideCard: {
    backgroundColor: Surface.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Surface.border, padding: Spacing.three, gap: Spacing.two,
  },
  sideCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sideCardTitle: { fontSize: 15, fontWeight: '800', color: TextColors.heading },
  sideCardSub:   { fontSize: 11, color: TextColors.muted, marginTop: -4 },
  macroRow:      { gap: 4 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel:    { fontSize: 12, fontWeight: '600', color: TextColors.body },
  macroValues:   { fontSize: 11, color: TextColors.muted },
  macroTrack:    { height: 6, backgroundColor: Surface.bg, borderRadius: 3, overflow: 'hidden' },
  macroFill:     { height: '100%', borderRadius: 3 },
  recentItem:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  recentImage:   { width: 48, height: 48, borderRadius: Radius.sm, resizeMode: 'cover' },
  recentName:    { fontSize: 13, fontWeight: '700', color: TextColors.heading },
  recentWhen:    { fontSize: 10, color: TextColors.muted, marginTop: 1 },
  reorderBtn: {
    backgroundColor: Brand.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  reorderText:   { fontSize: 11, fontWeight: '700', color: Brand.primary },
  cnnStatusText: { fontSize: 11, color: Brand.primary, lineHeight: 16 },
  resetBtn: {
    borderWidth: 1, borderColor: Brand.primaryBorder, borderRadius: Radius.sm,
    paddingVertical: 8, alignItems: 'center', marginTop: 4,
  },
  resetBtnText:  { color: Brand.primary, fontSize: 12, fontWeight: '700' },
  upgradeCard: {
    backgroundColor: Brand.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.three, alignItems: 'center',
  },
  upgradeText:   { color: '#FFF', fontWeight: '800', fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles — Landing Page
// ─────────────────────────────────────────────────────────────────────────────
const lp = StyleSheet.create({
  root: { flex: 1, backgroundColor: Surface.white },

  // Hero
  hero: {
    flexDirection: isWeb ? 'row' : 'column',
    paddingHorizontal: isWeb ? 80 : Spacing.four,
    paddingVertical: isWeb ? 80 : 40,
    gap: 40, alignItems: 'center', backgroundColor: Surface.white,
    paddingTop: isWeb ? 100 : 40,
  },
  heroLeft:  { flex: isWeb ? 1 : undefined, gap: 20 },
  heroRight: {
    flex: isWeb ? 1 : undefined, width: isWeb ? undefined : '100%',
    height: isWeb ? 420 : 260, borderRadius: Radius.xl,
    overflow: 'hidden', position: 'relative',
  },
  aiBadge: {
    backgroundColor: Brand.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start',
  },
  aiBadgeText:   { fontSize: 11, fontWeight: '800', color: Brand.primary, letterSpacing: 0.6 },
  h1: { fontSize: isWeb ? 48 : 34, fontWeight: '900', color: TextColors.heading, lineHeight: isWeb ? 58 : 42 },
  h1Accent:      { color: Brand.orange },
  heroSub:       { fontSize: 15, color: TextColors.muted, lineHeight: 24, maxWidth: 460 },
  heroBtns:      { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  btnPrimary: {
    backgroundColor: Brand.primary, borderRadius: Radius.full,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  btnPrimaryText:{ color: '#FFF', fontWeight: '700', fontSize: 15 },
  btnOutline: {
    borderWidth: 1.5, borderColor: Surface.border, borderRadius: Radius.full,
    paddingHorizontal: 22, paddingVertical: 14,
  },
  btnOutlineText:{ color: TextColors.body, fontWeight: '600', fontSize: 15 },
  heroMainImg:   { width: '100%', height: '100%', resizeMode: 'cover' },
  matchChip: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: Surface.white, borderRadius: Radius.md,
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  matchChipIcon:    { fontSize: 26 },
  matchChipLabel:   { fontSize: 9, fontWeight: '700', color: TextColors.muted, letterSpacing: 0.5 },
  matchChipValue:   { fontSize: 15, fontWeight: '800', color: TextColors.heading },
  matchChipProtein: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: Status.protein },

  // CNN Flow section
  cnnSection: {
    backgroundColor: Surface.bg, paddingHorizontal: isWeb ? 80 : Spacing.four,
    paddingVertical: isWeb ? 64 : 40, alignItems: 'center', gap: 24,
  },
  cnnTitle: { fontSize: isWeb ? 28 : 22, fontWeight: '800', color: TextColors.heading, textAlign: 'center' },
  cnnSub: { fontSize: 14, color: TextColors.muted, textAlign: 'center', lineHeight: 22, maxWidth: 600 },
  cnnFlow: {
    flexDirection: isWeb ? 'row' : 'column', alignItems: 'center',
    gap: isWeb ? 24 : 20, width: '100%', maxWidth: 900,
  },
  cnnStep:      { alignItems: 'center', gap: 12 },
  cnnStepLabel: { fontSize: 14, fontWeight: '800', color: TextColors.heading },
  cnnImgRow:    { flexDirection: 'row', gap: 10 },
  cnnSmallImgWrap: { alignItems: 'center', gap: 4, position: 'relative' },
  cnnSmallImg:  { width: isWeb ? 100 : 80, height: isWeb ? 100 : 80, borderRadius: Radius.md, resizeMode: 'cover' },
  cnnSmallLabel:{ fontSize: 9, color: TextColors.muted, maxWidth: 90, textAlign: 'center' },
  cnnMatchOverlay: {
    position: 'absolute', bottom: 20, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 3, alignItems: 'center',
  },
  cnnMatchText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  cnnArrow: { alignItems: 'center', gap: 8 },
  cnnArrowIcon: { fontSize: isWeb ? 28 : 20, color: TextColors.muted },
  cnnEngineBox: {
    backgroundColor: Brand.primaryLight, borderRadius: Radius.lg,
    padding: 14, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Brand.primaryBorder,
    minWidth: 80,
  },
  cnnEngineIcon:  { fontSize: 30 },
  cnnEngineLabel: { fontSize: 11, fontWeight: '800', color: Brand.primary, textAlign: 'center', lineHeight: 14 },
  cnnEngineSub:   { fontSize: 9, color: TextColors.muted, textAlign: 'center', lineHeight: 12 },

  // Features
  features: {
    paddingHorizontal: isWeb ? 80 : Spacing.four,
    paddingVertical: isWeb ? 64 : 40,
    alignItems: 'center', gap: 24, backgroundColor: Surface.white,
  },
  featTitle:  { fontSize: isWeb ? 32 : 24, fontWeight: '800', color: TextColors.heading, textAlign: 'center' },
  featSub:    { fontSize: 14, color: TextColors.muted, textAlign: 'center', maxWidth: 560, lineHeight: 22 },
  featCards:  { flexDirection: isWeb ? 'row' : 'column', gap: 20, width: '100%', maxWidth: 1000 },
  featCard: {
    flex: isWeb ? 1 : undefined, backgroundColor: Surface.bg,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Surface.border, padding: Spacing.four, gap: 10,
  },
  featIconWrap: {
    width: 60, height: 60, borderRadius: Radius.sm,
    backgroundColor: Brand.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  featTitle2: { fontSize: 16, fontWeight: '800', color: TextColors.heading },
  featDesc:   { fontSize: 13, color: TextColors.muted, lineHeight: 20 },

  // Dish preview scroll
  dishPreview: {
    paddingVertical: isWeb ? 48 : 32,
    backgroundColor: Surface.bg, gap: 20,
  },
  dishPreviewTitle: {
    fontSize: isWeb ? 28 : 22, fontWeight: '800', color: TextColors.heading,
    paddingHorizontal: isWeb ? 80 : Spacing.four,
  },
  dishScroll: { paddingHorizontal: isWeb ? 80 : Spacing.four, gap: 16 },
  dishThumb: {
    width: 200, backgroundColor: Surface.white,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Surface.border, overflow: 'hidden',
  },
  dishThumbImg:  { width: '100%', height: 130, resizeMode: 'cover' },
  dishThumbBody: { padding: 12, gap: 4 },
  dishThumbName: { fontSize: 13, fontWeight: '700', color: TextColors.heading },
  dishThumbMeta: { fontSize: 10, color: TextColors.muted },
  dishThumbFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  dishThumbPrice: { fontSize: 14, fontWeight: '800', color: Brand.primary },
  dishThumbMatch: { backgroundColor: Brand.primaryLight, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  dishThumbMatchText: { fontSize: 9, fontWeight: '700', color: Brand.primary },

  // CTA Banner
  ctaBanner: {
    backgroundColor: Brand.primary, paddingHorizontal: isWeb ? 80 : Spacing.four,
    paddingVertical: isWeb ? 60 : 40, alignItems: 'center', gap: 16,
  },
  ctaBannerTitle: { fontSize: isWeb ? 32 : 24, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  ctaBannerSub:   { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', maxWidth: 500, lineHeight: 22 },
  ctaBannerBtn: {
    backgroundColor: '#FFF', borderRadius: Radius.full,
    paddingHorizontal: 32, paddingVertical: 16, marginTop: 8,
  },
  ctaBannerBtnText: { color: Brand.primary, fontWeight: '800', fontSize: 16 },

  // Footer
  footer: {
    flexDirection: isWeb ? 'row' : 'column',
    paddingHorizontal: isWeb ? 80 : Spacing.four,
    paddingVertical: Spacing.four,
    borderTopWidth: 1, borderTopColor: Surface.border, backgroundColor: Surface.white,
    justifyContent: 'space-between', alignItems: isWeb ? 'center' : 'flex-start', gap: 16,
  },
  footerBrand: { fontSize: 18, fontWeight: '900', color: Brand.primary },
  footerCopy:  { fontSize: 12, color: TextColors.muted, marginTop: 2 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  footerLink:  { fontSize: 13, color: TextColors.muted },
});
