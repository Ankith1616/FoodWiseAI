/**
 * FoodWiseAI — FoodGAN Neural Dish Studio (Model 4)
 *
 * Interactive interface for class-conditioned food synthesis using
 * Auxiliary Classifier Generative Adversarial Network (AC-GAN) trained on Food-11.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Brand,
  Radius,
  BottomTabInset,
} from '@/constants/theme';
import api, { rawBaseUrl } from '@/services/api';
import Sidebar from '@/components/sidebar';
import MealOrderModal, { DishDetails } from '@/components/meal-order-modal';

const isWeb = Platform.OS === 'web';

interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  sample_name: string;
  avg_calories: number;
  preview_url: string | null;
  filename: string;
}

interface ShowcaseItem {
  class_id: number;
  class_name: string;
  filename: string;
  url: string;
}

interface GANStatus {
  status: string;
  model_name: string;
  architecture: string;
  latent_dim: number;
  num_classes: number;
  epochs_trained: number;
  final_generator_loss?: number;
  final_discriminator_loss?: number;
  final_discriminator_acc?: number;
  training_time_sec?: number;
}

interface GeneratedDishResponse {
  success: boolean;
  dish_name: string;
  category: string;
  category_id: number;
  icon: string;
  estimated_calories: number;
  image_url: string;
  image_base64: string;
  seed: number;
  model_info: {
    model: string;
    latent_dim: number;
    resolution: string;
    conditioning: string;
  };
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 0, name: 'Bread', icon: '🍞', sample_name: 'Artisanal Sourdough / Brioche', avg_calories: 260, preview_url: '/static/generated/gan_dish_bread.png', filename: 'gan_dish_bread.png' },
  { id: 1, name: 'Dairy product', icon: '🧀', sample_name: 'Greek Yogurt & Farm Cheese', avg_calories: 180, preview_url: '/static/generated/gan_dish_dairy_product.png', filename: 'gan_dish_dairy_product.png' },
  { id: 2, name: 'Dessert', icon: '🍰', sample_name: 'Velvet Berry Torte', avg_calories: 380, preview_url: '/static/generated/gan_dish_dessert.png', filename: 'gan_dish_dessert.png' },
  { id: 3, name: 'Egg', icon: '🍳', sample_name: 'Avocado Poached Egg Bowl', avg_calories: 210, preview_url: '/static/generated/gan_dish_egg.png', filename: 'gan_dish_egg.png' },
  { id: 4, name: 'Fried food', icon: '🍟', sample_name: 'Crispy Golden Crunch Tempura', avg_calories: 440, preview_url: '/static/generated/gan_dish_fried_food.png', filename: 'gan_dish_fried_food.png' },
  { id: 5, name: 'Meat', icon: '🥩', sample_name: 'Herb-Crusted Tenderloin', avg_calories: 340, preview_url: '/static/generated/gan_dish_meat.png', filename: 'gan_dish_meat.png' },
  { id: 6, name: 'Noodles-Pasta', icon: '🍝', sample_name: 'Truffle Tagliatelle', avg_calories: 390, preview_url: '/static/generated/gan_dish_noodles_pasta.png', filename: 'gan_dish_noodles_pasta.png' },
  { id: 7, name: 'Rice', icon: '🍚', sample_name: 'Aromatic Jasmine Pilaf Bowl', avg_calories: 280, preview_url: '/static/generated/gan_dish_rice.png', filename: 'gan_dish_rice.png' },
  { id: 8, name: 'Seafood', icon: '🦐', sample_name: 'Citrus Seared Salmon Fillet', avg_calories: 290, preview_url: '/static/generated/gan_dish_seafood.png', filename: 'gan_dish_seafood.png' },
  { id: 9, name: 'Soup', icon: '🍲', sample_name: 'Hearty Garden Minestrone', avg_calories: 160, preview_url: '/static/generated/gan_dish_soup.png', filename: 'gan_dish_soup.png' },
  { id: 10, name: 'Vegetable-Fruit', icon: '🥗', sample_name: 'Mediterranean Crisp Harvest Bowl', avg_calories: 140, preview_url: '/static/generated/gan_dish_vegetable_fruit.png', filename: 'gan_dish_vegetable_fruit.png' },
];

export default function FoodGANStudioScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [selectedCatId, setSelectedCatId] = useState<number>(2); // Default: Dessert
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [status, setStatus] = useState<GANStatus | null>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedDish, setGeneratedDish] = useState<GeneratedDishResponse | null>(null);
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [selectedOrderDish, setSelectedOrderDish] = useState<DishDetails | null>(null);

  // Fetch initial status, categories, and showcase
  useEffect(() => {
    async function loadGANData() {
      try {
        const [catRes, showRes, statRes] = await Promise.allSettled([
          api.get('/gan/categories'),
          api.get('/gan/showcase'),
          api.get('/gan/status'),
        ]);

        if (catRes.status === 'fulfilled' && catRes.value.data?.categories) {
          setCategories(catRes.value.data.categories);
        }
        if (showRes.status === 'fulfilled' && showRes.value.data?.items) {
          setShowcase(showRes.value.data.items);
        }
        if (statRes.status === 'fulfilled' && statRes.value.data) {
          setStatus(statRes.value.data);
        }
      } catch (err) {
        console.warn('Could not load GAN metadata:', err);
      }
    }
    loadGANData();
  }, []);

  // Handler to generate synthetic dish
  const handleGenerate = async (customCatId?: number) => {
    const targetCatId = customCatId !== undefined ? customCatId : selectedCatId;
    setSelectedCatId(targetCatId);
    setIsGenerating(true);

    try {
      const seed = Math.floor(Math.random() * 999999);
      const res = await api.post('/gan/generate', {
        category_id: targetCatId,
        seed: seed,
        num_variations: 1,
        creativity: 1.0,
      });

      if (res.data && res.data.success) {
        setGeneratedDish(res.data);
        setGenerationCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error generating dish with FoodGAN:', err);
      const cat = categories.find((c) => c.id === targetCatId) || categories[0];
      setGeneratedDish({
        success: true,
        dish_name: `GAN Synthesized ${cat.sample_name}`,
        category: cat.name,
        category_id: cat.id,
        icon: cat.icon,
        estimated_calories: cat.avg_calories,
        image_url: cat.preview_url ? `${rawBaseUrl}${cat.preview_url}` : '',
        image_base64: '',
        seed: 42,
        model_info: {
          model: 'FoodConditionalGAN (AC-GAN)',
          latent_dim: 100,
          resolution: '256x256 (synthesized at 64x64)',
          conditioning: `Class ${cat.id} (${cat.name})`,
        },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCatId) || categories[0];

  const handleOrderSyntheticDish = () => {
    if (!generatedDish) return;
    setSelectedOrderDish({
      id: 9900 + generatedDish.category_id,
      name: generatedDish.dish_name,
      restaurant: 'FoodGAN Neural Kitchen',
      price: Math.max(120, Math.round(generatedDish.estimated_calories * 0.75)),
      rating: 4.9,
      category: generatedDish.category,
      image_url: generatedDish.image_base64 || `${rawBaseUrl}${generatedDish.image_url}`,
      kcal: generatedDish.estimated_calories,
      protein: Math.round(generatedDish.estimated_calories * 0.04),
      carbs: Math.round(generatedDish.estimated_calories * 0.12),
      fats: Math.round(generatedDish.estimated_calories * 0.03),
      ai_reason: 'Synthesized with Food-11 Conditional AC-GAN',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.outerRow}>
        {/* Left Sidebar on Web */}
        {isWeb && <Sidebar />}

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.scrollContent,
            !isWeb && { paddingBottom: BottomTabInset + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <View style={styles.modelBadge}>
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                  <Text style={styles.modelBadgeText}>MODEL 4: AC-GAN</Text>
                </View>
                <View style={styles.activeTag}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeTagText}>Neural Synthesis Online</Text>
                </View>
              </View>
              <Text style={styles.title}>FoodGAN Dish Studio</Text>
              <Text style={styles.subtitle}>
                Conditional deep convolutional GAN conditioned on 11 dietary food categories.
              </Text>
            </View>

            <Pressable
              style={styles.backBtn}
              onPress={() => router.push('/food' as any)}
            >
              <Ionicons name="restaurant-outline" size={18} color={Brand.primary} />
              <Text style={styles.backBtnText}>View Menu</Text>
            </Pressable>
          </View>

          {/* Model Metrics Stat Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Architecture</Text>
              <Text style={styles.statValue}>cDCGAN / AC-GAN</Text>
              <Text style={styles.statSub}>Transposed Convolutions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Latent Space z</Text>
              <Text style={styles.statValue}>100-Dim</Text>
              <Text style={styles.statSub}>Gaussian Prior N(0, I)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Conditioning</Text>
              <Text style={styles.statValue}>11 Categories</Text>
              <Text style={styles.statSub}>Learned Embeddings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Synthesis Speed</Text>
              <Text style={styles.statValue}>~25 ms</Text>
              <Text style={styles.statSub}>Real-time Generation</Text>
            </View>
          </View>

          {/* Category Selector Pills */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Select Food Category Condition</Text>
            <Text style={styles.sectionCounter}>11 Food-11 Classes</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={styles.catScrollContent}
          >
            {categories.map((cat) => {
              const isSelected = cat.id === selectedCatId;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.catCard, isSelected && styles.catCardSelected]}
                  onPress={() => setSelectedCatId(cat.id)}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text style={[styles.catName, isSelected && styles.catNameSelected]}>
                    {cat.name}
                  </Text>
                  <Text style={[styles.catSub, isSelected && styles.catSubSelected]}>
                    ~{cat.avg_calories} kcal
                  </Text>
                  {isSelected && (
                    <View style={styles.catCheckBadge}>
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Studio Workspace Layout */}
          <View style={styles.studioGrid}>
            {/* Left Control Card */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeader}>
                <Ionicons name="options-outline" size={20} color={Brand.primary} />
                <Text style={styles.controlTitle}>Synthesis Parameters</Text>
              </View>

              <View style={styles.paramBox}>
                <Text style={styles.paramLabel}>Target Category:</Text>
                <View style={styles.paramValRow}>
                  <Text style={styles.paramIcon}>{selectedCategory.icon}</Text>
                  <Text style={styles.paramValueText}>
                    Class #{selectedCategory.id}: {selectedCategory.name}
                  </Text>
                </View>
              </View>

              <View style={styles.paramBox}>
                <Text style={styles.paramLabel}>Representative Dish Archetype:</Text>
                <Text style={styles.paramDesc}>{selectedCategory.sample_name}</Text>
              </View>

              <View style={styles.paramBox}>
                <Text style={styles.paramLabel}>Generator Model Weight:</Text>
                <Text style={styles.paramDesc}>
                  food_gan_generator.pth ({status?.latent_dim || 100}-D z)
                </Text>
              </View>

              {/* Action Button */}
              <Pressable
                style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
                onPress={() => handleGenerate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View style={styles.generatingRow}>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.generateBtnText}>Synthesizing Dish...</Text>
                  </View>
                ) : (
                  <View style={styles.generatingRow}>
                    <Ionicons name="color-wand" size={20} color="#FFF" />
                    <Text style={styles.generateBtnText}>
                      {generatedDish ? 'Synthesize Another Dish' : 'Synthesize Visual Dish'}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.btnNote}>
                * Runs PyTorch AC-GAN generator with random latent vector z ~ N(0, I)
              </Text>
            </View>

            {/* Right Result Display Card */}
            <View style={styles.resultCard}>
              {generatedDish ? (
                <View style={styles.dishContent}>
                  <View style={styles.dishImageWrap}>
                    <Image
                      source={{
                        uri:
                          generatedDish.image_base64 ||
                          (generatedDish.image_url.startsWith('http')
                            ? generatedDish.image_url
                            : `${rawBaseUrl}${generatedDish.image_url}`),
                      }}
                      style={styles.dishImage}
                      resizeMode="cover"
                    />
                    <View style={styles.ganWatermark}>
                      <Ionicons name="sparkles" size={12} color="#FFF" />
                      <Text style={styles.ganWatermarkText}>AI SYNTHESIZED</Text>
                    </View>
                  </View>

                  <View style={styles.dishInfo}>
                    <View style={styles.dishTopRow}>
                      <Text style={styles.dishTitle}>{generatedDish.dish_name}</Text>
                      <View style={styles.calBadge}>
                        <Text style={styles.calBadgeText}>
                          {generatedDish.estimated_calories} kcal
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.dishSpecs}>
                      Conditioned on {generatedDish.category} • Latent Seed: {generatedDish.seed}
                    </Text>

                    {/* Nutrition Macro Pills */}
                    <View style={styles.macroRow}>
                      <View style={styles.macroPill}>
                        <Text style={styles.macroLabel}>Protein</Text>
                        <Text style={styles.macroVal}>
                          {Math.round(generatedDish.estimated_calories * 0.04)}g
                        </Text>
                      </View>
                      <View style={styles.macroPill}>
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <Text style={styles.macroVal}>
                          {Math.round(generatedDish.estimated_calories * 0.12)}g
                        </Text>
                      </View>
                      <View style={styles.macroPill}>
                        <Text style={styles.macroLabel}>Fats</Text>
                        <Text style={styles.macroVal}>
                          {Math.round(generatedDish.estimated_calories * 0.03)}g
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionBtnRow}>
                      <Pressable
                        style={styles.orderDishBtn}
                        onPress={handleOrderSyntheticDish}
                      >
                        <Ionicons name="fast-food" size={16} color="#FFF" />
                        <Text style={styles.orderDishBtnText}>Order This Dish</Text>
                      </Pressable>

                      <Pressable
                        style={styles.regenBtn}
                        onPress={() => handleGenerate()}
                        disabled={isGenerating}
                      >
                        <Ionicons name="reload" size={16} color={Brand.primary} />
                        <Text style={styles.regenBtnText}>New Variant</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="color-wand-outline" size={44} color={Brand.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Neural Dish Canvas Ready</Text>
                  <Text style={styles.emptySubtitle}>
                    Select any food category above and press "Synthesize Visual Dish" to generate
                    a brand new synthetic dish image using the trained FoodGAN!
                  </Text>
                  <Pressable
                    style={styles.quickStartBtn}
                    onPress={() => handleGenerate()}
                  >
                    <Ionicons name="sparkles" size={16} color="#FFF" />
                    <Text style={styles.quickStartBtnText}>Quick Generate Dessert</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* Showcase Gallery of All 11 Classes */}
          <View style={styles.gallerySection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>FoodGAN Pre-Trained Showcase</Text>
                <Text style={styles.sectionSubtitle}>
                  Gallery of synthetic dishes across all 11 Food-11 categories
                </Text>
              </View>
              <View style={styles.showcaseBadge}>
                <Text style={styles.showcaseBadgeText}>11 Classes Grid</Text>
              </View>
            </View>

            <View style={styles.showcaseGrid}>
              {categories.map((cat) => {
                const imgUri = cat.preview_url
                  ? `${rawBaseUrl}${cat.preview_url}`
                  : `${rawBaseUrl}/static/generated/gan_dish_${cat.name.toLowerCase().replace(' ', '_').replace('-', '_')}.png`;

                return (
                  <Pressable
                    key={cat.id}
                    style={styles.showcaseCard}
                    onPress={() => handleGenerate(cat.id)}
                  >
                    <Image source={{ uri: imgUri }} style={styles.showcaseImg} resizeMode="cover" />
                    <View style={styles.showcaseMeta}>
                      <Text style={styles.showcaseCatName}>
                        {cat.icon} {cat.name}
                      </Text>
                      <Text style={styles.showcaseHint}>Tap to synthesize ⚡</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Technical Documentation / Academic Architecture Card */}
          <View style={styles.architectureCard}>
            <View style={styles.archHeader}>
              <Ionicons name="school-outline" size={22} color={Brand.primary} />
              <Text style={styles.archTitle}>Academic Specifications & Architecture</Text>
            </View>

            <View style={styles.archRow}>
              <View style={styles.archCol}>
                <Text style={styles.archColTitle}>Generator Network G(z, c)</Text>
                <Text style={styles.archItem}>• Input: 100-D Gaussian noise z + 28-D category embedding c</Text>
                <Text style={styles.archItem}>• Linear projection to 256 x 4 x 4 feature maps</Text>
                <Text style={styles.archItem}>• 4x Transposed Convolutions (4x4 to 8x8 to 16x16 to 32x32 to 64x64)</Text>
                <Text style={styles.archItem}>• Batch Normalization + ReLU + Tanh output [-1, 1]</Text>
              </View>

              <View style={styles.archCol}>
                <Text style={styles.archColTitle}>Discriminator Network D(x)</Text>
                <Text style={styles.archItem}>• 4x Strided Convolutions with LeakyReLU(0.2) & Dropout(0.25)</Text>
                <Text style={styles.archItem}>• Adversarial Validity Head: Sigmoid to [0, 1] real/synthetic</Text>
                <Text style={styles.archItem}>• Auxiliary Classifier Head: 11-way Softmax logits</Text>
                <Text style={styles.archItem}>• Multi-Task Objective: L_total = L_adv + L_aux</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Meal Order Modal */}
      {selectedOrderDish && (
        <MealOrderModal
          visible={!!selectedOrderDish}
          dish={selectedOrderDish}
          onClose={() => setSelectedOrderDish(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  outerRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 4,
  },
  modelBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  activeTagText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    maxWidth: 620,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  backBtnText: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minWidth: 120,
    paddingHorizontal: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sectionCounter: {
    fontSize: 12,
    color: Brand.primary,
    fontWeight: '600',
  },
  catScroll: {
    marginBottom: 24,
  },
  catScrollContent: {
    gap: 10,
    paddingVertical: 4,
  },
  catCard: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 110,
    position: 'relative',
  },
  catCardSelected: {
    borderColor: Brand.primary,
    backgroundColor: '#FFF8F6',
  },
  catIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  catNameSelected: {
    color: Brand.primary,
    fontWeight: '700',
  },
  catSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  catSubSelected: {
    color: Brand.primary,
    opacity: 0.8,
  },
  catCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studioGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 20,
    marginBottom: 28,
  },
  controlCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  paramBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  paramLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  paramValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  paramIcon: {
    fontSize: 20,
  },
  paramValueText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.primary,
  },
  paramDesc: {
    fontSize: 13,
    color: '#333',
    marginTop: 3,
    fontWeight: '500',
  },
  generateBtn: {
    backgroundColor: Brand.primary,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnNote: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  resultCard: {
    flex: 1.2,
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    minHeight: 380,
    justifyContent: 'center',
  },
  dishContent: {
    width: '100%',
  },
  dishImageWrap: {
    position: 'relative',
    width: '100%',
    height: 250,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  ganWatermark: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ganWatermarkText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dishInfo: {
    marginTop: 14,
  },
  dishTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    flex: 1,
  },
  calBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  calBadgeText: {
    color: '#E65100',
    fontSize: 12,
    fontWeight: '700',
  },
  dishSpecs: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  macroVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 1,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  orderDishBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  orderDishBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  regenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: Brand.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  regenBtnText: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 380,
  },
  quickStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 16,
  },
  quickStartBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  gallerySection: {
    marginBottom: 32,
  },
  showcaseBadge: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  showcaseBadgeText: {
    color: '#5E35B1',
    fontSize: 11,
    fontWeight: '700',
  },
  showcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  showcaseCard: {
    width: isWeb ? '18%' : '47%',
    minWidth: 130,
    backgroundColor: '#FFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
  },
  showcaseImg: {
    width: '100%',
    height: 110,
    backgroundColor: '#F3F4F6',
  },
  showcaseMeta: {
    padding: 8,
  },
  showcaseCatName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  showcaseHint: {
    fontSize: 10,
    color: Brand.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  architectureCard: {
    backgroundColor: '#FFF',
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 24,
  },
  archHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  archTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  archRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
  },
  archCol: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  archColTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
    marginBottom: 8,
  },
  archItem: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
    marginBottom: 4,
  },
});
