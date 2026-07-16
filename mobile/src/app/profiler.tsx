import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import api from '@/services/api';

interface ProfilerCard {
  id: number;
  name: string;
  restaurant: string;
  price: number;
  rating: number;
  category: string;
  image_emoji: string;
}

const isWeb = Platform.OS === 'web';
const CARD_WIDTH = isWeb ? 400 : Dimensions.get('window').width * 0.88;
const CARD_HEIGHT = isWeb ? 450 : 400;

export default function ProfilerScreen() {
  const router = useRouter();
  const { setLikedDishIds, setTasteRecommendations, setUserVectorSummary } = useAppStore();
  
  const [cards, setCards] = useState<ProfilerCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch cards on mount
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await api.get('/recommendations/profiler-cards');
        setCards(response.data);
      } catch (error) {
        console.error("Failed to load cards", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCards();
  }, []);

  const handleSwipe = (like: boolean) => {
    const currentCard = cards[currentIndex];
    let updatedLikes = [...likedIds];
    if (like) {
      updatedLikes.push(currentCard.id);
      setLikedIds(updatedLikes);
    }

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      submitTasteProfile(updatedLikes);
    }
  };

  const submitTasteProfile = async (finalLikedIds: number[]) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/recommendations/taste-profile', {
        liked_dish_ids: finalLikedIds,
      });
      
      setLikedDishIds(finalLikedIds);
      setTasteRecommendations(response.data.recommendations);
      setUserVectorSummary(response.data.user_vector_summary);
      
      router.replace('/');
    } catch (error) {
      console.error("Failed to submit taste profile", error);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff3366" />
        <ThemedText style={styles.loadingText}>Initializing Neural Appetite Profiler...</ThemedText>
      </View>
    );
  }

  if (isSubmitting) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <ThemedText style={[styles.loadingText, { color: '#3b82f6' }]}>
          🤖 CNN Feature Extraction Active
        </ThemedText>
        <ThemedText style={styles.subLoadingText}>
          Mapping visual vector coordinates into cosine similarity recommendation matrices
        </ThemedText>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={{ color: '#64748b' }}>Failed to retrieve appetite vectors.</ThemedText>
      </View>
    );
  }

  const activeCard = cards[currentIndex];

  // Neon-mesh backgrounds for dish types (adapted to lighter themes)
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'Italian': return { bg: '#fff5f5', border: '#ff3366' };
      case 'Healthy': return { bg: '#f0fdf4', border: '#10b981' };
      case 'Fast Food': return { bg: '#fffbeb', border: '#f59e0b' };
      case 'Desserts': return { bg: '#f5f3ff', border: '#8b5cf6' };
      case 'Indian': return { bg: '#fff7ed', border: '#ea580c' };
      default: return { bg: '#ecfeff', border: '#00f2fe' };
    }
  };

  const theme = getCategoryTheme(activeCard.category);

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Visual Appetite Test</ThemedText>
          <ThemedText style={styles.subtitle}>
            Rate the visual styles of these dishes. The CNN extracts feature mappings from foods you find visually delicious.
          </ThemedText>
          <View style={styles.progressContainer}>
            <ThemedText style={styles.progressText}>
              Vector Mapping: {currentIndex + 1} of {cards.length}
            </ThemedText>
          </View>
        </View>

        {/* Tinder-Style Glowing Card */}
        <View style={styles.cardContainer}>
          <View style={[styles.foodCard, { borderColor: theme.border, shadowColor: theme.border }]}>
            <View style={styles.cardGlowOverlay} />
            
            {/* Visual Header */}
            <View style={[styles.cardVisualArea, { backgroundColor: theme.bg }]}>
              <ThemedText style={styles.cardEmoji}>{activeCard.image_emoji}</ThemedText>
              
              <View style={[styles.categoryBadge, { borderColor: theme.border }]}>
                <ThemedText style={[styles.categoryBadgeText, { color: theme.border }]}>
                  {activeCard.category.toUpperCase()}
                </ThemedText>
              </View>
            </View>

            {/* Visual Footer */}
            <View style={styles.cardDetails}>
              <View>
                <ThemedText style={styles.dishName}>{activeCard.name}</ThemedText>
                <ThemedText style={styles.restaurantName}>from {activeCard.restaurant}</ThemedText>
              </View>

              <View style={styles.cardMetaRow}>
                <ThemedText style={styles.cardPrice}>₹{activeCard.price}</ThemedText>
                <ThemedText style={styles.cardRating}>⭐ {activeCard.rating}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Touch Button Controls */}
        <View style={styles.buttonRow}>
          <Pressable style={[styles.circleBtn, styles.btnDislike]} onPress={() => handleSwipe(false)}>
            <ThemedText style={styles.btnEmoji}>❌</ThemedText>
            <ThemedText style={styles.btnLabel}>PASS</ThemedText>
          </Pressable>

          <Pressable style={[styles.circleBtn, styles.btnLike, { borderColor: theme.border }]} onPress={() => handleSwipe(true)}>
            <ThemedText style={styles.btnEmoji}>❤️</ThemedText>
            <ThemedText style={[styles.btnLabel, { color: theme.border }]}>YUM!</ThemedText>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#ffffff', // Clean white background
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
    paddingBottom: Spacing.five,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: Spacing.four,
    color: '#ff3366',
    fontWeight: '700',
    fontSize: 15,
  },
  subLoadingText: {
    marginTop: Spacing.two,
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.four,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ff3366',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: Spacing.three,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b82f6',
    fontFamily: 'monospace',
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginVertical: Spacing.three,
  },
  foodCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#ffffff',
    borderRadius: Spacing.four,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlowOverlay: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  cardVisualArea: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardEmoji: {
    fontSize: 100,
  },
  categoryBadge: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.one,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardDetails: {
    padding: Spacing.four,
    justifyContent: 'space-between',
    flex: 1,
    backgroundColor: '#ffffff',
  },
  dishName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  restaurantName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  cardPrice: {
    color: '#ff3366',
    fontSize: 18,
    fontWeight: '800',
  },
  cardRating: {
    color: '#15803d',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.six,
    marginBottom: Spacing.two,
  },
  circleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnDislike: {
    borderColor: '#fca5a5',
  },
  btnLike: {
    borderWidth: 1.5,
  },
  btnEmoji: {
    fontSize: 24,
  },
  btnLabel: {
    fontSize: 9,
    marginTop: 3,
    color: '#ef4444',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
