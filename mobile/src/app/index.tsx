import React, { useState, useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import api from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

const isWeb = Platform.OS === 'web';
const CONTENT_MAX_WIDTH = isWeb ? 1300 : MaxContentWidth;

export default function HomeScreen() {
  const router = useRouter();
  const { tasteRecommendations, userVectorSummary, resetProfile } = useAppStore();

  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [totalOrders, setTotalOrders] = useState<number>(12);
  
  // Standard recommendations (Fallback)
  const [recommendations, setRecommendations] = useState<any[]>([
    {
      id: '1',
      name: 'Paneer Butter Masala',
      restaurant: 'Punjabi Rasoi',
      price: 240,
      rating: 4.6,
      category: 'Indian',
      image_emoji: '🍲',
      ai_tag: 'Frequent Pick',
      ai_reason: 'Matches your frequent Indian food ordering pattern',
      match_score: 95,
    },
    {
      id: '2',
      name: 'Quinoa Avocado Salad',
      restaurant: 'The Green Bowl',
      price: 290,
      rating: 4.8,
      category: 'Healthy',
      image_emoji: '🥗',
      ai_tag: 'Fit Target',
      ai_reason: 'Highly recommended for your low-carb, low-calorie profile',
      match_score: 89,
    },
    {
      id: '3',
      name: 'Chicken Dum Biryani',
      restaurant: 'Biryani Zone',
      price: 280,
      rating: 4.7,
      category: 'Indian',
      image_emoji: '🍚',
      ai_tag: 'Top Pick',
      ai_reason: 'Based on your recent 5x orders from Biryani Zone',
      match_score: 97,
    },
    {
      id: '4',
      name: 'Margherita Woodfired Pizza',
      restaurant: 'Toscano Pizzeria',
      price: 380,
      rating: 4.5,
      category: 'Italian',
      image_emoji: '🍕',
      ai_tag: 'Craving Match',
      ai_reason: 'Matches your visual preference for warm cheese textures',
      match_score: 92,
    },
  ]);

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        if (response.data?.status === 'healthy') {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const handleOrder = (item: any) => {
    Alert.alert(
      '🛒 Place Order',
      `Would you like to order "${item.name}" from "${item.restaurant}" for ₹${item.price}?`,
      [
        {
          text: 'Confirm',
          onPress: () => {
            setTotalOrders((prev) => prev + 1);
            Alert.alert(
              '🎉 Order Placed!',
              `Order placed successfully! FoodWiseAI updated your embedding weight history to refine future recommendations.`
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const activeRecommendations = tasteRecommendations.length > 0 ? tasteRecommendations : recommendations;

  const filteredRecommendations = activeRecommendations.filter((item: any) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.restaurant.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Healthy', 'Indian', 'Italian', 'Fast Food', 'Desserts'];

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.locationContainer}>
            <ThemedText style={styles.locationPin}>📍</ThemedText>
            <View>
              <View style={styles.locationRow}>
                <ThemedText style={styles.locationMain}>Amrita University</ThemedText>
                <ThemedText style={styles.dropdownArrow}>▼</ThemedText>
              </View>
              <ThemedText style={styles.locationSub}>Coimbatore Campus, TN</ThemedText>
            </View>
          </View>

          {/* Connected state badge */}
          <View style={[styles.statusBadge, backendStatus === 'online' ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.statusDot, backendStatus === 'online' ? styles.dotOnline : styles.dotOffline]} />
            <ThemedText style={styles.statusText}>
              {backendStatus === 'checking' ? 'Connecting...' : backendStatus === 'online' ? 'Neural Live' : 'Offline'}
            </ThemedText>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              style={styles.searchInput}
              placeholder="Search dishes, cuisines, or visual tags..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Neural Stats Dashboard */}
          <View style={styles.neuralCard}>
            <ThemedText style={styles.neuralHubTitle}>AI TASTE ENGINE STATUS</ThemedText>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statEmoji}>🧠</ThemedText>
                <ThemedText style={styles.statLabel}>CNN Vector</ThemedText>
                <ThemedText style={styles.statValue}>128-D Active</ThemedText>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumberText}>{totalOrders}</ThemedText>
                <ThemedText style={styles.statLabel}>Swipes & Orders</ThemedText>
                <ThemedText style={styles.statValue}>Trained weights</ThemedText>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumberText, { color: '#3b82f6' }]}>98%</ThemedText>
                <ThemedText style={styles.statLabel}>Accuracy</ThemedText>
                <ThemedText style={styles.statValue}>Visual Match</ThemedText>
              </View>
            </View>
          </View>

          {/* CNN Profiler Banner - Dynamic CTA */}
          {tasteRecommendations.length === 0 ? (
            <Pressable onPress={() => router.push('/profiler')} style={styles.ctaPressable}>
              <View style={styles.profilerCTA}>
                <View style={styles.ctaHeader}>
                  <ThemedText style={{ fontSize: 24 }}>🧠</ThemedText>
                  <View>
                    <ThemedText style={styles.ctaTitle}>Build Visual Appetite Profile</ThemedText>
                    <ThemedText style={styles.ctaSubtitle}>COMPULSORY CNN FEATURE TRAINING</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.ctaDescription}>
                  Play our Tinder-style visual preference game. Our Convolutional Neural Network will map your taste signature and personalize your delivery menu instantly.
                </ThemedText>
                <View style={styles.ctaButton}>
                  <ThemedText style={styles.ctaButtonText}>Start Visual Swipe →</ThemedText>
                </View>
              </View>
            </Pressable>
          ) : (
            <View style={styles.activeProfileCard}>
              <View style={styles.profileHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.activeRow}>
                    <View style={styles.pulseDot} />
                    <ThemedText style={styles.activeProfileTitle}>CNN Personalization Active</ThemedText>
                  </View>
                  <ThemedText style={styles.activeVectorText}>{userVectorSummary}</ThemedText>
                </View>
                <Pressable style={styles.resetBtn} onPress={resetProfile}>
                  <ThemedText style={styles.resetBtnText}>Reset Profile</ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.categoryPill,
                  selectedCategory === category ? styles.categoryPillActive : styles.categoryPillInactive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <ThemedText
                  style={[
                    styles.categoryText,
                    selectedCategory === category ? styles.categoryTextActive : styles.categoryTextInactive,
                  ]}
                >
                  {category}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {/* Dishes Feed Header */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>CNN Personalized Picks</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Dishes visually closest to your taste vectors (Euclidean Cosine Space)
            </ThemedText>
          </View>

          {/* Recommendations List (Responsive Grid Layout) */}
          {filteredRecommendations.length === 0 ? (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyText}>No matching taste targets found.</ThemedText>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredRecommendations.map((item: any) => (
                <View key={item.id} style={styles.foodCard}>
                  
                  {/* Visual Header row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.aiTagContainer}>
                      <ThemedText style={styles.aiTagText}>✨ {item.ai_tag || item.aiTag}</ThemedText>
                    </View>
                    <View style={styles.ratingContainer}>
                      <ThemedText style={styles.ratingText}>⭐ {item.rating}</ThemedText>
                    </View>
                  </View>

                  {/* Main dish visual body */}
                  <View style={styles.foodBody}>
                    <View style={styles.foodDetails}>
                      <ThemedText style={styles.foodName}>{item.name}</ThemedText>
                      <ThemedText style={styles.foodRestaurant}>by {item.restaurant}</ThemedText>
                      <ThemedText style={styles.foodPrice}>₹{item.price}</ThemedText>
                    </View>
                    
                    {/* Visual frame */}
                    <View style={styles.glowingImageFrame}>
                      <ThemedText style={styles.foodEmoji}>{item.image_emoji || item.imageEmoji}</ThemedText>
                    </View>
                  </View>

                  {/* CNN Visual Feature match percent & reasoning */}
                  <View style={styles.neuralReasonBox}>
                    <View style={styles.matchScoreBar}>
                      <View style={[styles.matchScoreFill, { width: `${item.match_score || 90}%` }]} />
                    </View>
                    <View style={styles.scoreRow}>
                      <ThemedText style={styles.reasonText} numberOfLines={2}>
                        💡 {item.ai_reason || item.aiReason}
                      </ThemedText>
                      <ThemedText style={styles.scoreText}>{item.match_score || 90}% Fit</ThemedText>
                    </View>
                  </View>

                  {/* Premium Order Button */}
                  <Pressable style={styles.orderBtn} onPress={() => handleOrder(item)}>
                    <ThemedText style={styles.orderBtnText}>Order Dish</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#ffffff', // Pure white background
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  locationPin: {
    fontSize: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  locationMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ff3366', // Swiggy/Zomato Red
  },
  dropdownArrow: {
    fontSize: 9,
    color: '#ff3366',
  },
  locationSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: Spacing.five,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  statusOffline: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#22c55e',
  },
  dotOffline: {
    backgroundColor: '#94a3b8',
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    marginVertical: Spacing.three,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9', // Light gray background
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.two : Spacing.one,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  neuralCard: {
    backgroundColor: '#f8fafc',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  neuralHubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 1.5,
    marginBottom: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statEmoji: {
    fontSize: 18,
  },
  statNumberText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ff3366',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  statValue: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 35,
    backgroundColor: '#e2e8f0',
  },
  ctaPressable: {
    marginBottom: Spacing.four,
  },
  profilerCTA: {
    backgroundColor: '#fff1f2', // Soft rose red
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    borderStyle: 'dashed',
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  ctaTitle: {
    color: '#e11d48',
    fontSize: 16,
    fontWeight: '800',
  },
  ctaSubtitle: {
    fontSize: 8,
    color: '#b91c1c',
    letterSpacing: 1,
    fontWeight: '800',
  },
  ctaDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  ctaButton: {
    backgroundColor: '#e11d48',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  activeProfileCard: {
    backgroundColor: '#f0fdf4', // Soft mint green
    borderRadius: Spacing.four,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: Spacing.four,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  activeProfileTitle: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
  activeVectorText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#166534',
    marginTop: 2,
  },
  resetBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Spacing.one,
  },
  resetBtnText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
  },
  categoryScroll: {
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  categoryPill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1,
    marginRight: Spacing.two,
  },
  categoryPillActive: {
    backgroundColor: '#ff3366',
    borderColor: '#ff3366',
  },
  categoryPillInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  categoryTextInactive: {
    color: '#64748b',
  },
  sectionHeader: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
    justifyContent: isWeb ? 'flex-start' : 'center',
    width: '100%',
  },
  foodCard: {
    backgroundColor: '#ffffff',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: isWeb ? '31.5%' : '100%',
    minWidth: isWeb ? 340 : '100%',
    marginBottom: isWeb ? 0 : Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  aiTagContainer: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  aiTagText: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '800',
  },
  ratingContainer: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Spacing.one,
  },
  ratingText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '700',
  },
  foodBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  foodDetails: {
    flex: 1,
    marginRight: Spacing.three,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  foodRestaurant: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  foodPrice: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: Spacing.two,
    color: '#ff3366',
  },
  glowingImageFrame: {
    width: 75,
    height: 75,
    backgroundColor: '#f8fafc',
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  foodEmoji: {
    fontSize: 38,
  },
  neuralReasonBox: {
    backgroundColor: '#f8fafc',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  matchScoreBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  matchScoreFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    flex: 1,
    marginRight: Spacing.two,
    lineHeight: 15,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3b82f6',
  },
  orderBtn: {
    backgroundColor: '#ff3366',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  orderBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    padding: Spacing.six,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#64748b',
  },
});
