/**
 * FoodWiseAI — Dataset Images Gallery Screen
 * Displays all 20 images from the Dataset folder with interactive preview modals,
 * image format badges, resolution metadata, and dish mappings.
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
  TextInput,
  Modal,
  Linking,
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
import api, { rawBaseUrl } from '@/services/api';
import Sidebar from '@/components/sidebar';
import MealOrderModal, { DishDetails } from '@/components/meal-order-modal';

const isWeb = Platform.OS === 'web';

interface DatasetImageItem {
  filename: string;
  url: string;
  static_url: string;
  size_kb: number;
  format: string;
  associated_dish: string;
  category: string;
  price: number;
  rating: number;
}

// Full 20 static fallback list matching root /Dataset folder
const FALLBACK_DATASET: DatasetImageItem[] = [
  { filename: 'best_chicken_lollipop_drums_of_chicken-500x500.jpg', url: '/dataset/best_chicken_lollipop_drums_of_chicken-500x500.jpg', static_url: '/static/dataset/best_chicken_lollipop_drums_of_chicken-500x500.jpg', size_kb: 50.6, format: 'JPG', associated_dish: 'Chicken Lollipop Drums', category: 'Indian', price: 260, rating: 4.8 },
  { filename: 'chicken-lollipop-1-500x500.webp', url: '/dataset/chicken-lollipop-1-500x500.webp', static_url: '/static/dataset/chicken-lollipop-1-500x500.webp', size_kb: 51.8, format: 'WEBP', associated_dish: 'Spicy Chicken Lollipop', category: 'Fast Food', price: 270, rating: 4.7 },
  { filename: 'chicken-lollipop-480x270.jpg', url: '/dataset/chicken-lollipop-480x270.jpg', static_url: '/static/dataset/chicken-lollipop-480x270.jpg', size_kb: 39.4, format: 'JPG', associated_dish: 'Crispy Chicken Lollipops', category: 'Fast Food', price: 250, rating: 4.6 },
  { filename: 'image-358.png', url: '/dataset/image-358.png', static_url: '/static/dataset/image-358.png', size_kb: 215.7, format: 'PNG', associated_dish: 'Paneer Tikka Skewers', category: 'Indian', price: 240, rating: 4.6 },
  { filename: 'images (1).jpeg', url: '/dataset/images (1).jpeg', static_url: '/static/dataset/images (1).jpeg', size_kb: 72.3, format: 'JPEG', associated_dish: 'Gourmet Chicken Bowl', category: 'Healthy', price: 290, rating: 4.5 },
  { filename: 'images (2).jpeg', url: '/dataset/images (2).jpeg', static_url: '/static/dataset/images (2).jpeg', size_kb: 81.4, format: 'JPEG', associated_dish: 'Chef Special Curry', category: 'Indian', price: 230, rating: 4.4 },
  { filename: 'images (3).jpeg', url: '/dataset/images (3).jpeg', static_url: '/static/dataset/images (3).jpeg', size_kb: 30.8, format: 'JPEG', associated_dish: 'Crispy Samosa Platter', category: 'Fast Food', price: 140, rating: 4.3 },
  { filename: 'images (4).jpeg', url: '/dataset/images (4).jpeg', static_url: '/static/dataset/images (4).jpeg', size_kb: 44.5, format: 'JPEG', associated_dish: 'Masala Dosa Supreme', category: 'Indian', price: 160, rating: 4.7 },
  { filename: 'images (5).jpeg', url: '/dataset/images (5).jpeg', static_url: '/static/dataset/images (5).jpeg', size_kb: 83.1, format: 'JPEG', associated_dish: 'Veg Biryani Special', category: 'Indian', price: 200, rating: 4.4 },
  { filename: 'images (6).jpeg', url: '/dataset/images (6).jpeg', static_url: '/static/dataset/images (6).jpeg', size_kb: 65.5, format: 'JPEG', associated_dish: 'Tandoori Roti Basket', category: 'Indian', price: 120, rating: 4.2 },
  { filename: 'images (7).jpeg', url: '/dataset/images (7).jpeg', static_url: '/static/dataset/images (7).jpeg', size_kb: 47.0, format: 'JPEG', associated_dish: 'Chicken Curry Kadai', category: 'Indian', price: 220, rating: 4.5 },
  { filename: 'images (8).jpeg', url: '/dataset/images (8).jpeg', static_url: '/static/dataset/images (8).jpeg', size_kb: 53.2, format: 'JPEG', associated_dish: 'Creamy Shahi Paneer', category: 'Indian', price: 250, rating: 4.6 },
  { filename: 'images (9).jpeg', url: '/dataset/images (9).jpeg', static_url: '/static/dataset/images (9).jpeg', size_kb: 65.4, format: 'JPEG', associated_dish: 'Dal Tadka Combo', category: 'Indian', price: 180, rating: 4.3 },
  { filename: 'images (10).jpeg', url: '/dataset/images (10).jpeg', static_url: '/static/dataset/images (10).jpeg', size_kb: 43.7, format: 'JPEG', associated_dish: 'Chicken Dum Biryani', category: 'Indian', price: 280, rating: 4.7 },
  { filename: 'images (11).jpeg', url: '/dataset/images (11).jpeg', static_url: '/static/dataset/images (11).jpeg', size_kb: 69.0, format: 'JPEG', associated_dish: 'Butter Naan & Dal Makhani', category: 'Indian', price: 190, rating: 4.4 },
  { filename: 'images.jpeg', url: '/dataset/images.jpeg', static_url: '/static/dataset/images.jpeg', size_kb: 27.3, format: 'JPEG', associated_dish: 'Gulab Jamun Sundae', category: 'Desserts', price: 120, rating: 4.9 },
  { filename: 'istockphoto-1410130688-612x612.jpg', url: '/dataset/istockphoto-1410130688-612x612.jpg', static_url: '/static/dataset/istockphoto-1410130688-612x612.jpg', size_kb: 53.4, format: 'JPG', associated_dish: 'Double Cheese Burger', category: 'Fast Food', price: 180, rating: 4.3 },
  { filename: 'istockphoto-1453499717-612x612.jpg', url: '/dataset/istockphoto-1453499717-612x612.jpg', static_url: '/static/dataset/istockphoto-1453499717-612x612.jpg', size_kb: 54.3, format: 'JPG', associated_dish: 'Loaded Peri Peri Fries', category: 'Fast Food', price: 150, rating: 4.2 },
  { filename: 'maxresdefault.jpg', url: '/dataset/maxresdefault.jpg', static_url: '/static/dataset/maxresdefault.jpg', size_kb: 209.6, format: 'JPG', associated_dish: 'Gourmet Food Feast', category: 'Healthy', price: 350, rating: 4.8 },
  { filename: 'pizza-with-olives-tomatoes-olives-it_1268410-858.avif', url: '/dataset/pizza-with-olives-tomatoes-olives-it_1268410-858.avif', static_url: '/static/dataset/pizza-with-olives-tomatoes-olives-it_1268410-858.avif', size_kb: 90.8, format: 'AVIF', associated_dish: 'Italian Pizza with Olives', category: 'Italian', price: 380, rating: 4.8 },
];

const CAT_FILTERS = ['All', 'Indian', 'Fast Food', 'Healthy', 'Italian', 'Desserts'];

export default function DatasetScreen() {
  const [images, setImages] = useState<DatasetImageItem[]>(FALLBACK_DATASET);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedImage, setSelectedImage] = useState<DatasetImageItem | null>(null);
  const [selectedOrderDish, setSelectedOrderDish] = useState<DishDetails | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/dataset/images');
        if (res.data?.images && res.data.images.length > 0) {
          setImages(res.data.images);
        }
      } catch {
        // use fallback static dataset list
      }
    })();
  }, []);

  const filteredImages = images.filter((img) => {
    const catMatch = selectedCat === 'All' || img.category === selectedCat;
    const searchLower = search.toLowerCase();
    const nameMatch =
      img.filename.toLowerCase().includes(searchLower) ||
      img.associated_dish.toLowerCase().includes(searchLower);
    return catMatch && nameMatch;
  });

  const getFullImgUrl = (img: DatasetImageItem) => {
    if (img.url.startsWith('http')) return img.url;
    return `${rawBaseUrl}${img.url}`;
  };

  const openImageInTab = (img: DatasetImageItem) => {
    const fullUrl = getFullImgUrl(img);
    if (Platform.OS === 'web') {
      window.open(fullUrl, '_blank');
    } else {
      Linking.openURL(fullUrl);
    }
  };

  const handleOrderDatasetItem = (img: DatasetImageItem) => {
    setSelectedOrderDish({
      id: Math.floor(Math.random() * 1000) + 20,
      name: img.associated_dish,
      restaurant: 'FoodWise AI Kitchen',
      price: img.price,
      rating: img.rating,
      category: img.category,
      dataset_file: img.filename,
      img: img.filename,
      kcal: 460,
      protein: 26,
      ai_reason: `Dataset image item (${img.filename}) selected directly from AI visual repository.`,
    });
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
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.titleIcon}>📁</Text>
                  <Text style={styles.titleText}>Dataset Images Gallery</Text>
                </View>
                <Text style={styles.subText}>
                  Explore all 20 high-resolution food images from the root <Text style={styles.codeText}>/Dataset</Text> directory used by FoodWiseAI neural feature extractors.
                </Text>
              </View>
              <View style={styles.totalBadge}>
                <Text style={styles.totalCount}>{images.length}</Text>
                <Text style={styles.totalLabel}>Dataset Images</Text>
              </View>
            </View>

            {/* Filter & Search Bar */}
            <View style={styles.barCard}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={TextColors.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search dataset images or dish names..."
                  placeholderTextColor={TextColors.muted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={TextColors.muted} />
                  </Pressable>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.catRow}>
                  {CAT_FILTERS.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.catChip,
                        selectedCat === cat && styles.catChipActive,
                      ]}
                      onPress={() => setSelectedCat(cat)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          selectedCat === cat && styles.catChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Grid */}
            <View style={styles.gridContainer}>
              {filteredImages.map((img) => {
                const imgUri = getFullImgUrl(img);
                return (
                  <View key={img.filename} style={styles.imageCard}>
                    <Pressable
                      style={styles.imagePreviewWrap}
                      onPress={() => setSelectedImage(img)}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.imageCardImg}
                        resizeMode="cover"
                      />
                      <View style={styles.formatBadge}>
                        <Text style={styles.formatText}>{img.format}</Text>
                      </View>
                      <View style={styles.sizeBadge}>
                        <Text style={styles.sizeText}>{img.size_kb} KB</Text>
                      </View>
                      <View style={styles.zoomHoverBtn}>
                        <Ionicons name="scan-outline" size={18} color="#FFF" />
                        <Text style={styles.zoomHoverText}>Inspect</Text>
                      </View>
                    </Pressable>

                    <View style={styles.cardInfo}>
                      <Text style={styles.dishName}>{img.associated_dish}</Text>
                      <Text style={styles.filenameText} numberOfLines={1} ellipsisMode="middle">
                        📄 {img.filename}
                      </Text>

                      <View style={styles.metaRow}>
                        <Text style={styles.categoryPill}>{img.category}</Text>
                        <Text style={styles.priceText}>₹{img.price}</Text>
                        <Text style={styles.ratingText}>⭐ {img.rating}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <Pressable
                          style={[styles.openBtn, { flex: 1, backgroundColor: Brand.primary }]}
                          onPress={() => handleOrderDatasetItem(img)}
                        >
                          <Ionicons name="bag-add-outline" size={14} color="#FFF" />
                          <Text style={[styles.openBtnText, { color: '#FFF' }]}>Select Meal</Text>
                        </Pressable>

                        <Pressable
                          style={[styles.openBtn, { backgroundColor: Surface.bg, borderColor: Surface.border }]}
                          onPress={() => openImageInTab(img)}
                        >
                          <Ionicons name="open-outline" size={14} color={TextColors.body} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {filteredImages.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color={TextColors.muted} />
                <Text style={styles.emptyTitle}>No dataset images found</Text>
                <Text style={styles.emptySub}>
                  No image matches "{search}". Try searching for another keyword or clear filters.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Modal Inspector */}
      {selectedImage && (
        <Modal
          visible={!!selectedImage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <Pressable style={styles.modalBg} onPress={() => setSelectedImage(null)}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedImage.associated_dish}</Text>
                  <Text style={styles.modalSub}>{selectedImage.filename}</Text>
                </View>
                <Pressable onPress={() => setSelectedImage(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={TextColors.heading} />
                </Pressable>
              </View>

              <View style={styles.modalImgWrap}>
                <Image
                  source={{ uri: getFullImgUrl(selectedImage) }}
                  style={styles.modalImg}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.modalGridDetails}>
                <View style={styles.modalDetailItem}>
                  <Text style={styles.detailLabel}>FILE FORMAT</Text>
                  <Text style={styles.detailVal}>{selectedImage.format}</Text>
                </View>
                <View style={styles.modalDetailItem}>
                  <Text style={styles.detailLabel}>FILE SIZE</Text>
                  <Text style={styles.detailVal}>{selectedImage.size_kb} KB</Text>
                </View>
                <View style={styles.modalDetailItem}>
                  <Text style={styles.detailLabel}>CATEGORY</Text>
                  <Text style={styles.detailVal}>{selectedImage.category}</Text>
                </View>
                <View style={styles.modalDetailItem}>
                  <Text style={styles.detailLabel}>PRICE</Text>
                  <Text style={styles.detailVal}>₹{selectedImage.price}</Text>
                </View>
              </View>

              <Pressable
                style={styles.fullDownloadBtn}
                onPress={() => openImageInTab(selectedImage)}
              >
                <Ionicons name="cloud-download-outline" size={16} color="#FFF" />
                <Text style={styles.fullDownloadText}>Open Direct Media URL</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: { fontSize: 24 },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    color: TextColors.heading,
  },
  subText: {
    fontSize: 13,
    color: TextColors.muted,
    marginTop: 4,
    lineHeight: 20,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Brand.primary,
    fontWeight: '700',
  },
  totalBadge: {
    backgroundColor: Surface.white,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  totalCount: {
    fontSize: 22,
    fontWeight: '900',
    color: Brand.primary,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TextColors.muted,
    marginTop: 2,
  },
  barCard: {
    backgroundColor: Surface.white,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Surface.bg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TextColors.heading,
    outlineStyle: 'none' as any,
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catChip: {
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Surface.white,
  },
  catChipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TextColors.body,
  },
  catChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: isWeb ? 'wrap' : 'nowrap',
    gap: Spacing.three,
  },
  imageCard: {
    width: isWeb ? '23.5%' : '100%',
    minWidth: isWeb ? 260 : undefined,
    backgroundColor: Surface.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Surface.border,
    overflow: 'hidden',
  },
  imagePreviewWrap: {
    height: 180,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  imageCardImg: {
    width: '100%',
    height: '100%',
  },
  formatBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  formatText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sizeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Surface.white,
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sizeText: {
    color: TextColors.heading,
    fontSize: 10,
    fontWeight: '700',
  },
  zoomHoverBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: Brand.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomHoverText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardInfo: {
    padding: Spacing.three,
    gap: 6,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '800',
    color: TextColors.heading,
  },
  filenameText: {
    fontSize: 11,
    color: TextColors.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryPill: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.primary,
    backgroundColor: Brand.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: TextColors.heading,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: TextColors.body,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Brand.primaryBorder,
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 8,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    backgroundColor: Surface.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Surface.border,
    marginTop: Spacing.four,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TextColors.heading,
  },
  emptySub: {
    fontSize: 13,
    color: TextColors.muted,
    textAlign: 'center',
  },
  // Modal styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: isWeb ? 560 : '95%',
    backgroundColor: Surface.white,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: TextColors.heading,
  },
  modalSub: {
    fontSize: 12,
    color: TextColors.muted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Surface.bg,
  },
  modalImgWrap: {
    height: 320,
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  modalImg: {
    width: '100%',
    height: '100%',
  },
  modalGridDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    backgroundColor: Surface.bg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  modalDetailItem: {
    width: '46%',
    gap: 2,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: TextColors.muted,
    letterSpacing: 0.5,
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '800',
    color: TextColors.heading,
  },
  fullDownloadBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullDownloadText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
