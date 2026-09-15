/**
 * FoodWiseAI — Meal Information & Order Modal
 * Interactive modal that displays full nutritional details, AI recommendation score,
 * quantity selector, spice preferences, special instructions, and order placement.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Brand,
  Surface,
  TextColors,
  Radius,
  Spacing,
  Status,
} from '@/constants/theme';
import { rawBaseUrl } from '@/services/api';
import { useAppStore, OrderItem } from '@/store/useAppStore';

export interface DishDetails {
  id: number;
  name: string;
  restaurant: string;
  price: number;
  rating?: number;
  category: string;
  img?: string;
  image_url?: string;
  dataset_file?: string;
  match_score?: number;
  ai_reason?: string;
  kcal?: number;
  protein?: { grams: number; percent: number } | number;
  fats?: { grams: number; percent: number } | number;
  carbs?: { grams: number; percent: number } | number;
}

interface Props {
  dish: DishDetails | null;
  visible: boolean;
  onClose: () => void;
}

const SPICE_OPTIONS = ['Mild 🍃', 'Medium 🌶️', 'Spicy 🔥'];

export default function MealOrderModal({ dish, visible, onClose }: Props) {
  const router = useRouter();
  const { placeOrder } = useAppStore();

  const [quantity, setQuantity] = useState(1);
  const [spiceLevel, setSpiceLevel] = useState('Medium 🌶️');
  const [instructions, setInstructions] = useState('');
  const [placedOrder, setPlacedOrder] = useState<OrderItem | null>(null);

  if (!dish) return null;

  const getImageUri = () => {
    if (dish.image_url) {
      if (dish.image_url.startsWith('http')) return dish.image_url;
      return `${rawBaseUrl}${dish.image_url}`;
    }
    if (dish.img) {
      if (dish.img.startsWith('/')) return `${rawBaseUrl}${dish.img}`;
      return `${rawBaseUrl}/dataset/${dish.img}`;
    }
    return `${rawBaseUrl}/dataset/images.jpeg`;
  };

  const getProteinGrams = (): number => {
    if (typeof dish.protein === 'number') return dish.protein;
    if (dish.protein?.grams) return dish.protein.grams;
    return 20;
  };

  const getFatsGrams = (): number => {
    if (typeof dish.fats === 'number') return dish.fats;
    if (dish.fats?.grams) return dish.fats.grams;
    return 14;
  };

  const getCarbsGrams = (): number => {
    if (typeof dish.carbs === 'number') return dish.carbs;
    if (dish.carbs?.grams) return dish.carbs.grams;
    return 28;
  };

  const totalPrice = dish.price * quantity;
  const imageFilename = dish.dataset_file || dish.img || 'dataset_image.jpg';

  const handleOrderSubmit = () => {
    const newOrder = placeOrder({
      dishId: dish.id,
      dishName: dish.name,
      restaurant: dish.restaurant,
      price: dish.price,
      quantity,
      totalPrice,
      image: imageFilename,
      category: dish.category,
      spiceLevel,
      instructions: instructions.trim() ? instructions.trim() : undefined,
      kcal: dish.kcal || 450,
      proteinGrams: getProteinGrams(),
    });
    setPlacedOrder(newOrder);
  };

  const handleClose = () => {
    setQuantity(1);
    setInstructions('');
    setPlacedOrder(null);
    onClose();
  };

  const goToProfile = () => {
    handleClose();
    router.push('/profile');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTag}>FOODWISE AI CULINARY INSIGHTS</Text>
              <Text style={styles.modalTitle}>{dish.name}</Text>
            </View>
            <Pressable style={styles.closeIconBtn} onPress={handleClose}>
              <Ionicons name="close" size={20} color={TextColors.heading} />
            </Pressable>
          </View>

          {!placedOrder ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Dish Image Banner */}
              <View style={styles.imageWrap}>
                <Image source={{ uri: getImageUri() }} style={styles.dishImg} resizeMode="cover" />
                <View style={styles.matchBadge}>
                  <Text style={styles.matchText}>{dish.match_score || 95}% MATCH</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>₹{dish.price}</Text>
                </View>
              </View>

              {/* Sub-header info */}
              <View style={styles.restaurantRow}>
                <Ionicons name="restaurant-outline" size={16} color={Brand.primary} />
                <Text style={styles.restaurantName}>{dish.restaurant}</Text>
                <View style={styles.dot} />
                <Ionicons name="star" size={14} color="#F39C12" />
                <Text style={styles.ratingVal}>{dish.rating || 4.7}</Text>
                <View style={styles.dot} />
                <Text style={styles.categoryPill}>{dish.category}</Text>
              </View>

              {/* AI Recommendation Reason */}
              <View style={styles.aiBox}>
                <View style={styles.aiBoxHeader}>
                  <Text style={{ fontSize: 14 }}>🎯</Text>
                  <Text style={styles.aiBoxTitle}>AI Match Intelligence</Text>
                </View>
                <Text style={styles.aiReasonText}>
                  {dish.ai_reason || 'Matches your recent culinary swipe preferences and metabolic macro targets.'}
                </Text>
              </View>

              {/* Nutritional & Macro Breakdown */}
              <Text style={styles.sectionLabel}>NUTRITIONAL & MACRO BREAKDOWN</Text>
              <View style={styles.macroGrid}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroVal}>{dish.kcal || 450} kcal</Text>
                  <Text style={styles.macroName}>CALORIES</Text>
                </View>
                <View style={[styles.macroCard, { borderColor: Status.protein + '40' }]}>
                  <Text style={[styles.macroVal, { color: Status.protein }]}>{getProteinGrams()}g</Text>
                  <Text style={styles.macroName}>PROTEIN</Text>
                </View>
                <View style={[styles.macroCard, { borderColor: Status.carbs + '40' }]}>
                  <Text style={[styles.macroVal, { color: Status.carbs }]}>{getFatsGrams()}g</Text>
                  <Text style={styles.macroName}>FATS</Text>
                </View>
                <View style={[styles.macroCard, { borderColor: Status.fats + '40' }]}>
                  <Text style={[styles.macroVal, { color: Status.fats }]}>{getCarbsGrams()}g</Text>
                  <Text style={styles.macroName}>CARBS</Text>
                </View>
              </View>

              {/* Ingredients & Allergens */}
              <Text style={styles.sectionLabel}>INGREDIENTS & ALLERGEN INFORMATION</Text>
              <View style={styles.detailsBox}>
                <Text style={styles.detailsSubLabel}>🌿 Key Ingredients:</Text>
                <Text style={styles.detailsText}>
                  Fresh chicken drumsticks / cottage cheese, ginger-garlic marinade, soy sauce, Kashmiri red chili, cornstarch crust, spring onions, refined oil, authentic spices.
                </Text>

                <View style={styles.allergenBadgeRow}>
                  <Text style={styles.detailsSubLabel}>⚠️ Allergen Alert:</Text>
                  <View style={styles.allergenTag}><Text style={styles.allergenTagText}>Gluten</Text></View>
                  <View style={styles.allergenTag}><Text style={styles.allergenTagText}>Soy</Text></View>
                  <View style={styles.allergenTag}><Text style={styles.allergenTagText}>Dairy (Paneer/Butter)</Text></View>
                </View>
              </View>

              {/* Ratings & Customer Reviews */}
              <Text style={styles.sectionLabel}>RATINGS & VERIFIED REVIEWS</Text>
              <View style={styles.reviewsBox}>
                <View style={styles.reviewHeader}>
                  <Ionicons name="star" size={16} color="#F39C12" />
                  <Text style={styles.reviewScoreText}>{dish.rating || 4.8} / 5.0</Text>
                  <Text style={styles.reviewCountText}>(148 verified orders)</Text>
                </View>
                <Text style={styles.reviewQuote}>
                  "Crispy on the outside, tender inside! Perfect protein macro ratio for dinner." — Ankith V.
                </Text>
              </View>

              {/* Similar Food Recommendations */}
              <Text style={styles.sectionLabel}>SIMILAR RECOMMENDED DISHES</Text>
              <View style={styles.similarRow}>
                <View style={styles.similarChip}><Text style={styles.similarChipText}>🍗 Spicy Chicken Lollipop (96%)</Text></View>
                <View style={styles.similarChip}><Text style={styles.similarChipText}>🥘 Chicken Dum Biryani (94%)</Text></View>
              </View>

              {/* Customization Options */}
              <Text style={styles.sectionLabel}>CUSTOMIZATION PREFERENCES</Text>

              {/* Spice Level */}
              <Text style={styles.inputSubLabel}>Spice Preference</Text>
              <View style={styles.spiceRow}>
                {SPICE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={[styles.spicePill, spiceLevel === opt && styles.spicePillActive]}
                    onPress={() => setSpiceLevel(opt)}
                  >
                    <Text style={[styles.spicePillText, spiceLevel === opt && styles.spicePillTextActive]}>
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Special Instructions */}
              <Text style={styles.inputSubLabel}>Special Cooking Instructions (Optional)</Text>
              <TextInput
                style={styles.instructionInput}
                placeholder="e.g. Less oil, extra chutney, cutlery required..."
                placeholderTextColor={TextColors.muted}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                numberOfLines={2}
              />

              {/* Quantity Counter */}
              <View style={styles.qtyRow}>
                <View>
                  <Text style={styles.qtyLabel}>QUANTITY</Text>

                  <Text style={styles.totalPriceText}>Total: ₹{totalPrice}</Text>
                </View>
                <View style={styles.counterBox}>
                  <Pressable
                    style={styles.counterBtn}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Text style={styles.counterBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.counterVal}>{quantity}</Text>
                  <Pressable
                    style={styles.counterBtn}
                    onPress={() => setQuantity(quantity + 1)}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Order Button */}
              <Pressable style={styles.orderSubmitBtn} onPress={handleOrderSubmit}>
                <Ionicons name="bag-check-outline" size={20} color="#FFF" />
                <Text style={styles.orderSubmitText}>Place Order Now (₹{totalPrice})</Text>
              </Pressable>
            </ScrollView>
          ) : (
            /* Order Placed Success Confirmation */
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-done-circle" size={56} color="#2ECC71" />
              </View>
              <Text style={styles.successTitle}>Order Placed Successfully!</Text>
              <Text style={styles.successSub}>
                Your order <Text style={styles.boldText}>{placedOrder.id}</Text> has been received by <Text style={styles.boldText}>{placedOrder.restaurant}</Text>.
              </Text>

              <View style={styles.receiptCard}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Item</Text>
                  <Text style={styles.receiptVal}>{placedOrder.quantity}x {placedOrder.dishName}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Spice Preference</Text>
                  <Text style={styles.receiptVal}>{placedOrder.spiceLevel}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Est. Delivery</Text>
                  <Text style={[styles.receiptVal, { color: Brand.primary, fontWeight: '800' }]}>25 - 35 mins 🛵</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptTotalLabel}>Amount Paid</Text>
                  <Text style={styles.receiptTotalVal}>₹{placedOrder.totalPrice}</Text>
                </View>
              </View>

              <View style={styles.successBtnRow}>
                <Pressable style={styles.profileBtn} onPress={goToProfile}>
                  <Ionicons name="time-outline" size={18} color="#FFF" />
                  <Text style={styles.profileBtnText}>View Past Orders in Profile</Text>
                </Pressable>
                <Pressable style={styles.closeTextBtn} onPress={handleClose}>
                  <Text style={styles.closeTextBtnText}>Close Window</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalContainer: {
    width: Platform.OS === 'web' ? 520 : '98%',
    maxHeight: '90%',
    backgroundColor: Surface.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Surface.border,
  },
  modalTag: {
    fontSize: 9,
    fontWeight: '800',
    color: Brand.primary,
    letterSpacing: 0.6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: TextColors.heading,
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Surface.bg,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  imageWrap: {
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Surface.bg,
  },
  dishImg: {
    width: '100%',
    height: '100%',
  },
  matchBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  priceBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: TextColors.heading,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restaurantName: {
    fontSize: 13,
    fontWeight: '700',
    color: TextColors.body,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TextColors.muted,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: '700',
    color: TextColors.heading,
  },
  categoryPill: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.primary,
    backgroundColor: Brand.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  aiBox: {
    backgroundColor: Brand.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
  },
  aiBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.primary,
  },
  aiReasonText: {
    fontSize: 12,
    color: TextColors.body,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: TextColors.muted,
    letterSpacing: 0.6,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Surface.bg,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.md,
    padding: Spacing.two,
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 14,
    fontWeight: '900',
    color: TextColors.heading,
  },
  macroName: {
    fontSize: 9,
    fontWeight: '700',
    color: TextColors.muted,
    marginTop: 2,
  },
  // Extra detail styles
  detailsBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  detailsSubLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  detailsText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  allergenBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  allergenTag: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  allergenTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  reviewsBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewCountText: {
    fontSize: 11,
    color: '#64748B',
  },
  reviewQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
  },
  similarRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  similarChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  similarChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  inputSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TextColors.heading,
  },
  spiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  spicePill: {
    flex: 1,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Surface.white,
  },
  spicePillActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  spicePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: TextColors.body,
  },
  spicePillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  instructionInput: {
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.md,
    padding: Spacing.two,
    fontSize: 13,
    color: TextColors.heading,
    backgroundColor: Surface.bg,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  qtyLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: TextColors.muted,
  },
  totalPriceText: {
    fontSize: 18,
    fontWeight: '900',
    color: Brand.primary,
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  counterBtn: {
    width: 38,
    height: 38,
    backgroundColor: Surface.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: TextColors.heading,
  },
  counterVal: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '800',
    color: TextColors.heading,
  },
  orderSubmitBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  orderSubmitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  // Success state styles
  successContainer: {
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: TextColors.heading,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: TextColors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  boldText: {
    fontWeight: '700',
    color: TextColors.heading,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: Surface.bg,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: TextColors.muted,
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: TextColors.heading,
  },
  divider: {
    height: 1,
    backgroundColor: Surface.border,
    marginVertical: 4,
  },
  receiptTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: TextColors.heading,
  },
  receiptTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: Brand.primary,
  },
  successBtnRow: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  profileBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  closeTextBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeTextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: TextColors.muted,
  },
});
