/**
 * FoodWiseAI — Food Catalog Page
 * Complete food catalog with search, sort, filter, Veg/Non-Veg badges.
 * Respects global dietaryMode from app store.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  Brand,
  Surface,
  TextColors,
  Radius,
  Spacing,
  BottomTabInset,
  Status,
} from '@/constants/theme';
import { rawBaseUrl } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import MealOrderModal, { DishDetails } from '@/components/meal-order-modal';

const isWeb = Platform.OS === 'web';
const IMG = (f: string) => {
  if (!f) return `${rawBaseUrl}/dataset/images.jpeg`;
  if (f.startsWith('/dataset/') || f.startsWith('/static/')) return `${rawBaseUrl}${f}`;
  return `${rawBaseUrl}/dataset/${f}`;
};

type FoodItem = {
  id: number;
  name: string;
  restaurant: string;
  cuisine: string;
  price: number;
  rating: number;
  kcal: number;
  img: string;
  isVeg: boolean;
  match: number;
};

const ALL_FOODS: FoodItem[] = [
  { id: 1,  name: 'Chicken Lollipop Drums',    restaurant: 'Spice Station',          cuisine: 'Indian',    price: 260, rating: 4.8, kcal: 450, img: 'best_chicken_lollipop_drums_of_chicken-500x500.jpg', isVeg: false, match: 98 },
  { id: 2,  name: 'Spicy Chicken Lollipop',     restaurant: 'Asian Wok & Grill',      cuisine: 'Fast Food', price: 270, rating: 4.7, kcal: 430, img: 'chicken-lollipop-1-500x500.webp',                   isVeg: false, match: 96 },
  { id: 3,  name: 'Crispy Chicken Lollipops',   restaurant: 'The Sizzler House',      cuisine: 'Fast Food', price: 250, rating: 4.6, kcal: 410, img: 'chicken-lollipop-480x270.jpg',                     isVeg: false, match: 94 },
  { id: 4,  name: 'Paneer Tikka Skewers',       restaurant: 'Grill Station',          cuisine: 'Indian',    price: 240, rating: 4.6, kcal: 390, img: 'image-358.png',                                       isVeg: true,  match: 93 },
  { id: 5,  name: 'Gourmet Chicken Bowl',       restaurant: 'Healthy Bytes',          cuisine: 'Healthy',   price: 290, rating: 4.5, kcal: 380, img: 'images (1).jpeg',                                     isVeg: false, match: 91 },
  { id: 6,  name: 'Chef Special Curry',         restaurant: 'Punjabi Rasoi',          cuisine: 'Indian',    price: 230, rating: 4.4, kcal: 420, img: 'images (2).jpeg',                                     isVeg: false, match: 90 },
  { id: 7,  name: 'Crispy Samosa Platter',      restaurant: 'Street Bites',           cuisine: 'Fast Food', price: 140, rating: 4.3, kcal: 320, img: 'images (3).jpeg',                                     isVeg: true,  match: 86 },
  { id: 8,  name: 'Masala Dosa Supreme',        restaurant: 'South Express',          cuisine: 'Indian',    price: 160, rating: 4.7, kcal: 340, img: 'images (4).jpeg',                                     isVeg: true,  match: 89 },
  { id: 9,  name: 'Veg Biryani Special',        restaurant: 'Royal Biryani House',    cuisine: 'Indian',    price: 200, rating: 4.4, kcal: 460, img: 'images (5).jpeg',                                     isVeg: true,  match: 87 },
  { id: 10, name: 'Tandoori Roti Basket',       restaurant: 'The Dhaba',              cuisine: 'Indian',    price: 120, rating: 4.2, kcal: 260, img: 'images (6).jpeg',                                     isVeg: true,  match: 83 },
  { id: 11, name: 'Chicken Curry Kadai',        restaurant: 'Spice Route',            cuisine: 'Indian',    price: 220, rating: 4.5, kcal: 440, img: 'images (7).jpeg',                                     isVeg: false, match: 92 },
  { id: 12, name: 'Creamy Shahi Paneer',        restaurant: 'The Royal Feast',        cuisine: 'Indian',    price: 250, rating: 4.6, kcal: 410, img: 'images (8).jpeg',                                     isVeg: true,  match: 88 },
  { id: 13, name: 'Dal Tadka Combo',            restaurant: 'Desi Kitchen',           cuisine: 'Indian',    price: 180, rating: 4.3, kcal: 310, img: 'images (9).jpeg',                                     isVeg: true,  match: 85 },
  { id: 14, name: 'Chicken Dum Biryani',        restaurant: 'Biryani Zone',           cuisine: 'Indian',    price: 280, rating: 4.7, kcal: 510, img: 'images (10).jpeg',                                    isVeg: false, match: 94 },
  { id: 15, name: 'Butter Naan & Dal Makhani', restaurant: 'The Dhaba',              cuisine: 'Indian',    price: 190, rating: 4.4, kcal: 380, img: 'images (11).jpeg',                                    isVeg: true,  match: 88 },
  { id: 16, name: 'Gulab Jamun Sundae',        restaurant: 'Sweet Tooth Patisserie', cuisine: 'Desserts',  price: 120, rating: 4.9, kcal: 380, img: 'images.jpeg',                                          isVeg: true,  match: 88 },
  { id: 17, name: 'Double Cheese Burger',       restaurant: 'Burger House',           cuisine: 'Fast Food', price: 180, rating: 4.3, kcal: 680, img: 'istockphoto-1410130688-612x612.jpg',                isVeg: false, match: 75 },
  { id: 18, name: 'Loaded Peri Peri Fries',     restaurant: 'The Fry Express',        cuisine: 'Fast Food', price: 150, rating: 4.2, kcal: 430, img: 'istockphoto-1453499717-612x612.jpg',                isVeg: true,  match: 70 },
  { id: 19, name: 'Gourmet Food Feast',        restaurant: 'Grand Bistro',           cuisine: 'Healthy',   price: 350, rating: 4.8, kcal: 520, img: 'maxresdefault.jpg',                                   isVeg: false, match: 92 },
  { id: 20, name: 'Italian Pizza with Olives', restaurant: 'Toscano Pizzeria',       cuisine: 'Italian',   price: 380, rating: 4.8, kcal: 560, img: 'pizza-with-olives-tomatoes-olives-it_1268410-858.avif', isVeg: true, match: 95 },
];

const CUISINES = ['All', 'Indian', 'Italian', 'Fast Food', 'Healthy', 'Desserts'];
const SORT_OPTIONS = [
  { label: 'Best Match',  value: 'match'  },
  { label: 'Price: Low',  value: 'price_asc' },
  { label: 'Price: High', value: 'price_desc'},
  { label: 'Rating',      value: 'rating' },
  { label: 'Calories',    value: 'kcal'   },
];

export default function FoodScreen() {
  const { dietaryMode, setDietaryMode } = useAppStore();

  const [search,       setSearch]       = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [sortBy,       setSortBy]       = useState('match');
  const [maxPrice,     setMaxPrice]     = useState(500);
  const [maxKcal,      setMaxKcal]      = useState(700);
  const [showFilters,  setShowFilters]  = useState(true);
  const [selectedDish, setSelectedDish] = useState<DishDetails | null>(null);

  const filtered = useMemo(() => {
    let items = [...ALL_FOODS];

    // Dietary mode filter
    if (dietaryMode === 'veg')     items = items.filter(i => i.isVeg);
    if (dietaryMode === 'non-veg') items = items.filter(i => !i.isVeg);

    // Cuisine filter
    if (selectedCuisine !== 'All') items = items.filter(i => i.cuisine === selectedCuisine);

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.restaurant.toLowerCase().includes(q) ||
        i.cuisine.toLowerCase().includes(q)
      );
    }

    // Price & Calories filter
    items = items.filter(i => i.price <= maxPrice && i.kcal <= maxKcal);

    // Sort
    if (sortBy === 'price_asc')  items.sort((a, b) => a.price   - b.price);
    if (sortBy === 'price_desc') items.sort((a, b) => b.price   - a.price);
    if (sortBy === 'rating')     items.sort((a, b) => b.rating  - a.rating);
    if (sortBy === 'kcal')       items.sort((a, b) => a.kcal    - b.kcal);
    if (sortBy === 'match')      items.sort((a, b) => b.match   - a.match);

    return items;
  }, [dietaryMode, selectedCuisine, search, maxPrice, sortBy]);

  const handleOrder = (item: FoodItem) => {
    setSelectedDish({
      id: item.id,
      name: item.name,
      restaurant: item.restaurant,
      price: item.price,
      rating: item.rating,
      category: item.cuisine,
      img: item.img,
      kcal: item.kcal,
      protein: 22,
      ai_reason: `${item.match}% match with your taste profile — ${item.cuisine} cuisine at ₹${item.price}.`,
    });
  };

  return (
    <View style={styles.root}>
      {isWeb && <Sidebar />}

      <View style={styles.main}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

            {/* ── Top Toolbar ── */}
            <View style={styles.toolbar}>
              <View style={styles.toolbarLeft}>
                <Text style={styles.pageTitle}>🍽️ Food Catalog</Text>
                <Text style={styles.pageSub}>{filtered.length} items available</Text>
              </View>

              <View style={styles.toolbarRight}>
                {/* Search */}
                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={15} color={TextColors.muted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search dishes, cuisines..."
                    placeholderTextColor={TextColors.placeholder}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={15} color={TextColors.muted} />
                    </Pressable>
                  )}
                </View>

                {/* Veg / Non-Veg Toggle */}
                <View style={styles.vegToggle}>
                  <Pressable
                    style={[styles.vegBtn, dietaryMode === 'veg' && styles.vegBtnActive]}
                    onPress={() => setDietaryMode(dietaryMode === 'veg' ? 'all' : 'veg')}
                  >
                    <View style={styles.vegDot} />
                    <Text style={[styles.vegBtnText, dietaryMode === 'veg' && styles.vegBtnTextActive]}>Veg</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.nonVegBtn, dietaryMode === 'non-veg' && styles.nonVegBtnActive]}
                    onPress={() => setDietaryMode(dietaryMode === 'non-veg' ? 'all' : 'non-veg')}
                  >
                    <View style={styles.nonVegDot} />
                    <Text style={[styles.nonVegBtnText, dietaryMode === 'non-veg' && styles.nonVegBtnTextActive]}>Non-Veg</Text>
                  </Pressable>
                </View>

                {/* Notification */}
                <Pressable style={styles.iconBtn}>
                  <Ionicons name="notifications-outline" size={18} color={TextColors.body} />
                </Pressable>

                {/* Filter toggle */}
                <Pressable
                  style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
                  onPress={() => setShowFilters(p => !p)}
                >
                  <Ionicons name="options-outline" size={16} color={showFilters ? '#FFF' : TextColors.body} />
                  <Text style={[styles.filterToggleText, showFilters && { color: '#FFF' }]}>Filters</Text>
                </Pressable>
              </View>
            </View>

            {/* ── Always-Visible Filter Bar ── */}
            <View style={styles.filterBar}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>SORT BY</Text>
                <View style={styles.sortRow}>
                  {SORT_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      style={[styles.sortBtn, sortBy === opt.value && styles.sortBtnActive]}
                      onPress={() => setSortBy(opt.value)}
                    >
                      <Text style={[styles.sortBtnText, sortBy === opt.value && styles.sortBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>MAX PRICE: ₹{maxPrice}</Text>
                <View style={styles.priceRow}>
                  {[150, 250, 350, 500].map(p => (
                    <Pressable
                      key={p}
                      style={[styles.priceBtn, maxPrice === p && styles.priceBtnActive]}
                      onPress={() => setMaxPrice(p)}
                    >
                      <Text style={[styles.priceBtnText, maxPrice === p && styles.priceBtnTextActive]}>
                        ₹{p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>MAX CALORIES: {maxKcal} kcal</Text>
                <View style={styles.priceRow}>
                  {[350, 450, 550, 700].map(k => (
                    <Pressable
                      key={k}
                      style={[styles.priceBtn, maxKcal === k && styles.priceBtnActive]}
                      onPress={() => setMaxKcal(k)}
                    >
                      <Text style={[styles.priceBtnText, maxKcal === k && styles.priceBtnTextActive]}>
                        {k} kcal
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Cuisine Chips ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.cuisineChipRow}>
                {CUISINES.map(c => (
                  <Pressable
                    key={c}
                    style={[styles.cuisineChip, selectedCuisine === c && styles.cuisineChipActive]}
                    onPress={() => setSelectedCuisine(c)}
                  >
                    <Text style={[styles.cuisineChipText, selectedCuisine === c && styles.cuisineChipTextActive]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* ── Food Grid ── */}
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>🍽️</Text>
                <Text style={styles.emptyTitle}>No items found</Text>
                <Text style={styles.emptySub}>Try adjusting your filters or search query.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filtered.map(item => (
                  <Pressable key={item.id} style={styles.card} onPress={() => handleOrder(item)}>
                    {/* Image */}
                    <View style={styles.cardImageWrap}>
                      <Image source={{ uri: IMG(item.img) }} style={styles.cardImage} resizeMode="cover" />
                      {/* Match badge */}
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchText}>{item.match}%</Text>
                      </View>
                      {/* Price badge */}
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>₹{item.price}</Text>
                      </View>
                      {/* Veg/Non-Veg indicator */}
                      <View style={[styles.vegIndicator, item.isVeg ? styles.vegIndicatorGreen : styles.vegIndicatorRed]}>
                        <View style={[styles.vegIndicatorDot, item.isVeg ? styles.vegDotGreen : styles.vegDotRed]} />
                      </View>
                    </View>

                    {/* Body */}
                    <View style={styles.cardBody}>
                      {/* Top row: cuisine + rating */}
                      <View style={styles.cardTopRow}>
                        <View style={styles.cuisinePill}>
                          <Text style={styles.cuisinePillText}>{item.cuisine}</Text>
                        </View>
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={11} color="#F39C12" />
                          <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                      </View>

                      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.cardRestaurant}>{item.restaurant}</Text>

                      {/* Calories + Veg label */}
                      <View style={styles.cardMetaRow}>
                        <Text style={styles.cardKcal}>🔥 {item.kcal} kcal</Text>
                        <View style={[styles.vegLabel, item.isVeg ? styles.vegLabelGreen : styles.vegLabelRed]}>
                          <Text style={[styles.vegLabelText, item.isVeg ? styles.vegLabelTextGreen : styles.vegLabelTextRed]}>
                            {item.isVeg ? '🟢 VEG' : '🔴 NON-VEG'}
                          </Text>
                        </View>
                      </View>

                      {/* Order button */}
                      <View style={styles.orderBtn}>
                        <Text style={styles.orderBtnText}>View Details & Order</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>

      {selectedDish && (
        <MealOrderModal
          dish={selectedDish}
          visible={!!selectedDish}
          onClose={() => setSelectedDish(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Surface.bg,
  },
  main: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },

  // Toolbar
  toolbar: {
    flexDirection: isWeb ? 'row' : 'column',
    alignItems: isWeb ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  toolbarLeft: {
    gap: 2,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: TextColors.heading,
  },
  pageSub: {
    fontSize: 12,
    color: TextColors.muted,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.white,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    width: isWeb ? 240 : '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TextColors.body,
    outlineStyle: 'none',
  } as any,

  // Veg Toggle
  vegToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
    backgroundColor: Surface.white,
  },
  vegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  vegBtnActive: {
    backgroundColor: '#E8F8F0',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#2ECC71',
  },
  vegBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: TextColors.muted,
  },
  vegBtnTextActive: {
    color: '#27AE60',
    fontWeight: '700',
  },
  nonVegBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  nonVegBtnActive: {
    backgroundColor: '#FEF0EE',
  },
  nonVegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
  },
  nonVegBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: TextColors.muted,
  },
  nonVegBtnTextActive: {
    color: '#E74C3C',
    fontWeight: '700',
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Surface.white,
    borderWidth: 1,
    borderColor: Surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Surface.border,
    backgroundColor: Surface.white,
  },
  filterToggleBtnActive: {
    backgroundColor: TextColors.heading,
    borderColor: TextColors.heading,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: TextColors.body,
  },

  // Filter Bar
  filterBar: {
    backgroundColor: Surface.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Surface.border,
    padding: Spacing.three,
    flexDirection: isWeb ? 'row' : 'column',
    gap: Spacing.three,
  },
  filterSection: {
    gap: 8,
    flex: 1,
  },
  filterLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: TextColors.muted,
    letterSpacing: 0.8,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sortBtn: {
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Surface.white,
  },
  sortBtnActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: TextColors.body,
  },
  sortBtnTextActive: {
    color: '#FFF',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 6,
  },
  priceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: Surface.white,
  },
  priceBtnActive: {
    backgroundColor: Brand.primaryLight,
    borderColor: Brand.primaryBorder,
  },
  priceBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: TextColors.muted,
  },
  priceBtnTextActive: {
    color: Brand.primary,
    fontWeight: '700',
  },

  // Cuisine chips
  cuisineChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  cuisineChip: {
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: Surface.white,
  },
  cuisineChipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  cuisineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TextColors.body,
  },
  cuisineChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  // Grid
  grid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: isWeb ? 'wrap' : 'nowrap',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  card: {
    backgroundColor: Surface.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Surface.border,
    overflow: 'hidden',
    width: isWeb ? '31%' : '100%',
    minWidth: isWeb ? 260 : undefined,
    maxWidth: isWeb ? 380 : undefined,
  },
  cardImageWrap: {
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  matchBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  matchText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  priceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Surface.white,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
    color: TextColors.heading,
  },
  vegIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  vegIndicatorGreen: {
    backgroundColor: '#FFF',
    borderColor: '#27AE60',
  },
  vegIndicatorRed: {
    backgroundColor: '#FFF',
    borderColor: '#E74C3C',
  },
  vegIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  vegDotGreen: {
    backgroundColor: '#27AE60',
  },
  vegDotRed: {
    backgroundColor: '#E74C3C',
  },

  // Card body
  cardBody: {
    padding: Spacing.three,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cuisinePill: {
    backgroundColor: Brand.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  cuisinePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: TextColors.heading,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: TextColors.heading,
    lineHeight: 20,
    marginTop: 2,
  },
  cardRestaurant: {
    fontSize: 11,
    color: TextColors.muted,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  cardKcal: {
    fontSize: 11,
    color: TextColors.muted,
  },
  vegLabel: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vegLabelGreen: {
    backgroundColor: '#E8F8F0',
  },
  vegLabelRed: {
    backgroundColor: '#FEF0EE',
  },
  vegLabelText: {
    fontSize: 9,
    fontWeight: '800',
  },
  vegLabelTextGreen: {
    color: '#27AE60',
  },
  vegLabelTextRed: {
    color: '#E74C3C',
  },
  orderBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  orderBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TextColors.heading,
  },
  emptySub: {
    fontSize: 13,
    color: TextColors.muted,
    textAlign: 'center',
  },
});
