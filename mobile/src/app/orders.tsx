/**
 * FoodWiseAI — Dedicated Orders Screen
 * Complete order history, order dates, meal times (Breakfast, Lunch, Evening Snacks, Dinner),
 * restaurant details, total amount, reordering, and receipt modal view.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  Modal,
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
} from '@/constants/theme';
import { rawBaseUrl } from '@/services/api';
import { useAppStore, OrderItem } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import MealOrderModal, { DishDetails } from '@/components/meal-order-modal';

const isWeb = Platform.OS === 'web';

const MEAL_TIMES = ['All Meals', 'Breakfast 🌅', 'Lunch ☀️', 'Evening Snacks ☕', 'Dinner 🌙'];

export default function OrdersScreen() {
  const { orders } = useAppStore();

  const [selectedMealFilter, setSelectedMealFilter] = useState('All Meals');
  const [selectedReceipt, setSelectedReceipt] = useState<OrderItem | null>(null);
  const [reorderDish, setReorderDish] = useState<DishDetails | null>(null);

  const getImgUri = (imgFilename: string) => {
    if (!imgFilename) return `${rawBaseUrl}/dataset/images.jpeg`;
    if (imgFilename.startsWith('/')) return `${rawBaseUrl}${imgFilename}`;
    return `${rawBaseUrl}/dataset/${imgFilename}`;
  };

  const filteredOrders = orders.filter((order) => {
    if (selectedMealFilter === 'All Meals') return true;
    return order.mealTime === selectedMealFilter;
  });

  const handleReorder = (order: OrderItem) => {
    const dishData: DishDetails = {
      id: order.dishId,
      name: order.dishName,
      restaurant: order.restaurant,
      price: order.price,
      rating: 4.8,
      category: order.category,
      img: order.image,
      kcal: order.kcal,
      protein: order.proteinGrams,
      ai_reason: `Reordering ${order.dishName} from ${order.restaurant}.`,
    };
    setReorderDish(dishData);
  };

  return (
    <View style={styles.root}>
      {isWeb && <Sidebar />}

      <View style={styles.main}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* Page Header */}
            <View style={styles.pageHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Ionicons name="receipt-outline" size={24} color="#E03126" />
                  <Text style={styles.pageTitle}>Order History</Text>
                </View>
                <Text style={styles.pageSub}>
                  View all your past culinary orders, delivery receipts, and meal timing breakdowns.
                </Text>
              </View>
            </View>

            {/* Meal Time Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <View style={styles.filterChipsRow}>
                {MEAL_TIMES.map((meal) => (
                  <Pressable
                    key={meal}
                    style={[
                      styles.filterChip,
                      selectedMealFilter === meal && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedMealFilter(meal)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedMealFilter === meal && styles.filterChipTextActive,
                      ]}
                    >
                      {meal}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Orders Metrics Banner */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryVal}>{orders.length}</Text>
                <Text style={styles.summaryLabel}>TOTAL ORDERS</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryVal, { color: '#E03126' }]}>
                  ₹{orders.reduce((acc, o) => acc + o.totalPrice, 0)}
                </Text>
                <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryVal, { color: '#2563EB' }]}>
                  {orders.filter((o) => o.mealTime?.includes('Lunch')).length}
                </Text>
                <Text style={styles.summaryLabel}>LUNCH ORDERS</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryVal, { color: '#16A34A' }]}>
                  {orders.filter((o) => o.mealTime?.includes('Dinner')).length}
                </Text>
                <Text style={styles.summaryLabel}>DINNER ORDERS</Text>
              </View>
            </View>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>🧾</Text>
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.emptySub}>No orders match the selected meal time filter.</Text>
              </View>
            ) : (
              <View style={styles.ordersList}>
                {filteredOrders.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    {/* Dish Thumbnail */}
                    <View style={styles.orderImgWrap}>
                      <Image
                        source={{ uri: getImgUri(order.image) }}
                        style={styles.orderImg}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Order Information Body */}
                    <View style={styles.orderBody}>
                      <View style={styles.orderTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.orderDishName}>{order.dishName}</Text>
                          <Text style={styles.orderRestName}>📍 {order.restaurant}</Text>
                        </View>
                        <View style={styles.statusPill}>
                          <Text style={styles.statusText}>{order.status}</Text>
                        </View>
                      </View>

                      {/* Meta Tags: Meal Time, Date, Spice Level */}
                      <View style={styles.metaTagsRow}>
                        <View style={styles.mealTimePill}>
                          <Text style={styles.mealTimeText}>{order.mealTime}</Text>
                        </View>
                        <Text style={styles.orderMetaText}>
                          {order.quantity}x item  •  {order.spiceLevel}
                        </Text>
                        <Text style={styles.orderDateText}>🗓️ {order.date}</Text>
                      </View>

                      {order.instructions && (
                        <Text style={styles.instructionNote}>
                          💬 Note: "{order.instructions}"
                        </Text>
                      )}

                      {/* Bottom Price & Action Buttons */}
                      <View style={styles.orderBottomRow}>
                        <Text style={styles.orderPrice}>₹{order.totalPrice}</Text>

                        <View style={styles.actionBtnsRow}>
                          <Pressable
                            style={styles.receiptBtn}
                            onPress={() => setSelectedReceipt(order)}
                          >
                            <Ionicons name="document-text-outline" size={14} color="#334155" />
                            <Text style={styles.receiptBtnText}>View Receipt</Text>
                          </Pressable>

                          <Pressable
                            style={styles.reorderBtn}
                            onPress={() => handleReorder(order)}
                          >
                            <Ionicons name="repeat-outline" size={14} color="#FFF" />
                            <Text style={styles.reorderBtnText}>Reorder Meal</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <Modal
          visible={!!selectedReceipt}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedReceipt(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedReceipt(null)}>
            <View style={styles.receiptModalContainer}>
              <View style={styles.receiptHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptModalTag}>OFFICIAL DELIVERY RECEIPT</Text>
                  <Text style={styles.receiptModalTitle}>{selectedReceipt.id}</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setSelectedReceipt(null)}>
                  <Ionicons name="close" size={20} color="#0F172A" />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 20 }}>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Restaurant</Text>
                  <Text style={styles.receiptDetailVal}>{selectedReceipt.restaurant}</Text>
                </View>

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Ordered Item</Text>
                  <Text style={styles.receiptDetailVal}>{selectedReceipt.quantity}x {selectedReceipt.dishName}</Text>
                </View>

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Meal Slot</Text>
                  <Text style={styles.receiptDetailVal}>{selectedReceipt.mealTime}</Text>
                </View>

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Order Date</Text>
                  <Text style={styles.receiptDetailVal}>{selectedReceipt.date}</Text>
                </View>

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Spice Preference</Text>
                  <Text style={styles.receiptDetailVal}>{selectedReceipt.spiceLevel}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Item Subtotal</Text>
                  <Text style={styles.receiptDetailVal}>₹{selectedReceipt.totalPrice - 40}</Text>
                </View>

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Delivery & Taxes</Text>
                  <Text style={styles.receiptDetailVal}>₹40</Text>
                </View>

                <View style={[styles.receiptDetailRow, { marginTop: 10 }]}>
                  <Text style={styles.receiptTotalLabel}>Total Paid</Text>
                  <Text style={styles.receiptTotalVal}>₹{selectedReceipt.totalPrice}</Text>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Reorder Modal Trigger */}
      {reorderDish && (
        <MealOrderModal
          dish={reorderDish}
          visible={!!reorderDish}
          onClose={() => setReorderDish(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
  },
  main: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: isWeb ? 70 : 20,
    paddingBottom: BottomTabInset + 30,
    gap: 16,
  },

  pageHeader: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  pageSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },

  // Meal Filter Chips
  filterScroll: {
    marginBottom: 6,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#E03126',
    borderColor: '#E03126',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Summary Metrics
  summaryGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Orders List
  ordersList: {
    gap: 14,
  },
  orderCard: {
    flexDirection: isWeb ? 'row' : 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    padding: 14,
    gap: 14,
  },
  orderImgWrap: {
    width: isWeb ? 130 : '100%',
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
  },
  orderImg: {
    width: '100%',
    height: '100%',
  },
  orderBody: {
    flex: 1,
    gap: 6,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderDishName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderRestName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  metaTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  mealTimePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mealTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  orderMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  orderDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  instructionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
  },
  orderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E03126',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  receiptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E03126',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  reorderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  receiptModalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  receiptModalTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E03126',
    letterSpacing: 0.6,
  },
  receiptModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  receiptDetailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  receiptDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 10,
  },
  receiptTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E03126',
  },
});
