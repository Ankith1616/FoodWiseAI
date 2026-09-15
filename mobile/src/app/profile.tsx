/**
 * FoodWiseAI — Dedicated User Profile & Account Settings Screen
 * Manages personal info, current location, saved addresses, favorite foods, preferred cuisines,
 * dietary preferences, budget preferences, health goals, survey responses, and account settings.
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
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import {
  Brand,
  Surface,
  TextColors,
  Radius,
  Spacing,
  BottomTabInset,
} from '@/constants/theme';
import { rawBaseUrl } from '@/services/api';
import { useAppStore, SavedAddress } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';

const isWeb = Platform.OS === 'web';

export default function ProfileScreen() {
  const {
    savedAddresses,
    favoriteFoods,
    preferredCuisines,
    dietaryPreference,
    budgetPreference,
    mealPreferences,
    healthGoals,
    surveyResponses,
    userSurveyPreferences,
    updateSurveyPreferences,
    orders,
    setDietaryPreference,
    setBudgetPreference,
    toggleMealPreference,
    addSavedAddress,
    removeSavedAddress,
    resetProfile,
  } = useAppStore();

  // Profile Edit States
  const [userName, setUserName] = useState('Ankith V');
  const [userEmail, setUserEmail] = useState('ankith.v@foodwise.ai');
  const [userPhone, setUserPhone] = useState('+91 98765 43210');
  const [currentLocation, setCurrentLocation] = useState('Koramangala 5th Block, Bangalore, India');
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // New Address Modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrText, setNewAddrText] = useState('');

  // Account Settings state
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [aiRecNotifs, setAiRecNotifs] = useState(true);

  const handleAddAddress = () => {
    if (!newAddrLabel.trim() || !newAddrText.trim()) return;
    addSavedAddress({
      id: `addr-${Date.now()}`,
      label: newAddrLabel.trim(),
      address: newAddrText.trim(),
      isDefault: false,
    });
    setNewAddrLabel('');
    setNewAddrText('');
    setShowAddressModal(false);
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
            {/* Header Banner */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80' }}
                  style={styles.avatarImg}
                />
                <View style={styles.proBadge}>
                  <Ionicons name="sparkles" size={10} color="#FFF" />
                </View>
              </View>

              <View style={styles.userInfoCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.userNameText}>{userName}</Text>
                  <View style={styles.proPill}>
                    <Text style={styles.proPillText}>PRO MEMBER</Text>
                  </View>
                </View>
                <Text style={styles.userEmailText}>{userEmail}  •  {userPhone}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#E03126" />
                  <Text style={styles.locationText}>{currentLocation}</Text>
                </View>
              </View>

              <Pressable
                style={styles.editProfileBtn}
                onPress={() => setIsEditingInfo((p) => !p)}
              >
                <Ionicons name={isEditingInfo ? 'checkmark-outline' : 'create-outline'} size={16} color="#334155" />
                <Text style={styles.editProfileBtnText}>
                  {isEditingInfo ? 'Save Info' : 'Edit Profile'}
                </Text>
              </Pressable>
            </View>

            {/* Appetite Profiler Card */}
            <View style={styles.profilerCard}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.profilerTagRow}>
                  <Text style={{ fontSize: 16 }}>🧬</Text>
                  <Text style={styles.profilerTagText}>AI APPETITE PROFILER</Text>
                </View>
                <Text style={styles.profilerTitle}>Personalized Taste & Macro Vector</Text>
                <Text style={styles.profilerSub}>
                  Take or retake the interactive swipe profiler to update your neural embeddings and recommendation weights.
                </Text>
              </View>
              <Pressable
                style={styles.openProfilerBtn}
                onPress={() => useRouter().push('/profiler')}
              >
                <Ionicons name="sparkles" size={16} color="#FFF" />
                <Text style={styles.openProfilerBtnText}>Launch Profiler</Text>
              </Pressable>
            </View>

            {/* Editable Info Box */}
            {isEditingInfo && (
              <View style={styles.editInfoBox}>
                <Text style={styles.boxTitle}>EDIT PERSONAL INFORMATION</Text>

                <View style={styles.inputGrid}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={userName}
                      onChangeText={setUserName}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      style={styles.textInput}
                      value={userEmail}
                      onChangeText={setUserEmail}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={userPhone}
                      onChangeText={setUserPhone}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Current Location</Text>
                    <TextInput
                      style={styles.textInput}
                      value={currentLocation}
                      onChangeText={setCurrentLocation}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Dietary & Budget Preferences */}
            <View style={styles.cardSection}>
              <Text style={styles.boxTitle}>DIETARY & BUDGET PREFERENCES</Text>

              <View style={styles.prefGrid}>
                {/* Dietary Preference Toggle */}
                <View style={styles.prefBox}>
                  <Text style={styles.prefLabel}>Dietary Type</Text>
                  <View style={styles.pillRow}>
                    {(['Veg', 'Non-Veg'] as const).map((type) => (
                      <Pressable
                        key={type}
                        style={[
                          styles.prefPill,
                          dietaryPreference === type && styles.prefPillActive,
                        ]}
                        onPress={() => setDietaryPreference(type)}
                      >
                        <Text
                          style={[
                            styles.prefPillText,
                            dietaryPreference === type && styles.prefPillTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Budget Preference */}
                <View style={styles.prefBox}>
                  <Text style={styles.prefLabel}>Budget Target</Text>
                  <View style={styles.pillRow}>
                    {(['₹', '₹₹', '₹₹₹'] as const).map((b) => (
                      <Pressable
                        key={b}
                        style={[
                          styles.prefPill,
                          budgetPreference === b && styles.prefPillActive,
                        ]}
                        onPress={() => setBudgetPreference(b)}
                      >
                        <Text
                          style={[
                            styles.prefPillText,
                            budgetPreference === b && styles.prefPillTextActive,
                          ]}
                        >
                          {b}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Non-Veg Fasting Days & Time-Slot Recommendation Controls */}
            <View style={styles.cardSection}>
              <Text style={styles.boxTitle}>SMART DYNAMIC RECOMMENDATION RULES</Text>

              {/* Fasting Days Selector */}
              <Text style={styles.subLabel}>🗓️ Non-Veg Fasting Days (Auto-switch to Veg on these days):</Text>
              <View style={styles.chipWrapRow}>
                {['Thursday 🌿', 'Saturday 🌿', 'Monday 🌿', 'Tuesday 🌿'].map((day) => {
                  const isSelected = userSurveyPreferences.nonVegFastDays?.includes(day);
                  return (
                    <Pressable
                      key={day}
                      style={[styles.fastChip, isSelected && styles.fastChipActive]}
                      onPress={() => {
                        const current = userSurveyPreferences.nonVegFastDays || [];
                        const updated = isSelected
                          ? current.filter((d) => d !== day)
                          : [...current, day];
                        updateSurveyPreferences({ nonVegFastDays: updated });
                      }}
                    >
                      <Text style={[styles.fastChipText, isSelected && styles.fastChipTextActive]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Past Order History Bias Switch */}
              <View style={[styles.settingRow, { marginTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Order History Personalization Bias</Text>
                  <Text style={styles.settingSub}>
                    Prioritize recommendations matching your past order history items ({orders.length} past orders)
                  </Text>
                </View>
                <Pressable
                  style={[styles.toggleSwitch, userSurveyPreferences.enableOrderHistoryBias && styles.toggleSwitchActive]}
                  onPress={() =>
                    updateSurveyPreferences({
                      enableOrderHistoryBias: !userSurveyPreferences.enableOrderHistoryBias,
                    })
                  }
                >
                  <View style={[styles.toggleThumb, userSurveyPreferences.enableOrderHistoryBias && styles.toggleThumbActive]} />
                </Pressable>
              </View>
            </View>

            {/* Favorite Foods & Preferred Cuisines */}
            <View style={styles.cardSection}>
              <Text style={styles.boxTitle}>FAVORITE FOODS & PREFERRED CUISINES</Text>

              <Text style={styles.subLabel}>Favorite Dishes</Text>
              <View style={styles.chipWrapRow}>
                {favoriteFoods.map((food) => (
                  <View key={food} style={styles.favChip}>
                    <Text style={styles.favChipText}>❤️ {food}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.subLabel, { marginTop: 12 }]}>Preferred Cuisines</Text>
              <View style={styles.chipWrapRow}>
                {preferredCuisines.map((c) => (
                  <View key={c} style={styles.cuisineChip}>
                    <Text style={styles.cuisineChipText}>🍛 {c}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Health Goals */}
            <View style={styles.cardSection}>
              <Text style={styles.boxTitle}>METABOLIC & HEALTH GOALS</Text>
              <View style={styles.chipWrapRow}>
                {healthGoals.map((goal) => (
                  <View key={goal} style={styles.goalChip}>
                    <Ionicons name="fitness-outline" size={14} color="#16A34A" />
                    <Text style={styles.goalChipText}>{goal}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Saved Delivery Addresses */}
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.boxTitle}>SAVED DELIVERY ADDRESSES</Text>
                <Pressable style={styles.addAddrBtn} onPress={() => setShowAddressModal(true)}>
                  <Ionicons name="add" size={16} color="#E03126" />
                  <Text style={styles.addAddrBtnText}>Add Address</Text>
                </Pressable>
              </View>

              <View style={styles.addressesGrid}>
                {savedAddresses.map((addr) => (
                  <View key={addr.id} style={styles.addressCard}>
                    <View style={styles.addrTopRow}>
                      <View style={styles.addrLabelBadge}>
                        <Ionicons name="home-outline" size={14} color="#E03126" />
                        <Text style={styles.addrLabelText}>{addr.label}</Text>
                      </View>
                      {addr.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addrText}>{addr.address}</Text>

                    {!addr.isDefault && (
                      <Pressable
                        style={styles.removeAddrBtn}
                        onPress={() => removeSavedAddress(addr.id)}
                      >
                        <Text style={styles.removeAddrText}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Survey Responses */}
            <View style={styles.cardSection}>
              <Text style={styles.boxTitle}>APPETITE PROFILER SURVEY RESPONSES</Text>
              <View style={styles.surveyList}>
                {surveyResponses.map((res, i) => (
                  <View key={i} style={styles.surveyItem}>
                    <Text style={styles.surveyQ}>Q: {res.question}</Text>
                    <Text style={styles.surveyA}>A: {res.answer}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Account Settings */}
            <View style={styles.cardSection}>
              <Text style={styles.boxTitle}>ACCOUNT & NOTIFICATION SETTINGS</Text>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>AI Culinary Recommendations</Text>
                  <Text style={styles.settingSub}>Receive daily personalized food recommendations</Text>
                </View>
                <Pressable
                  style={[styles.toggleSwitch, aiRecNotifs && styles.toggleSwitchActive]}
                  onPress={() => setAiRecNotifs((p) => !p)}
                >
                  <View style={[styles.toggleThumb, aiRecNotifs && styles.toggleThumbActive]} />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Email Order Receipts</Text>
                  <Text style={styles.settingSub}>Get digital invoices sent to {userEmail}</Text>
                </View>
                <Pressable
                  style={[styles.toggleSwitch, emailNotifs && styles.toggleSwitchActive]}
                  onPress={() => setEmailNotifs((p) => !p)}
                >
                  <View style={[styles.toggleThumb, emailNotifs && styles.toggleThumbActive]} />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <Pressable style={styles.resetProfileBtn} onPress={resetProfile}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.resetProfileText}>Reset Vector Profiler & History</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Add Address Modal */}
      {showAddressModal && (
        <Modal
          visible={showAddressModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddressModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddressModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Delivery Address</Text>

              <Text style={styles.inputLabel}>Address Label (e.g., Home, Office)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Label"
                value={newAddrLabel}
                onChangeText={setNewAddrLabel}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Full Address</Text>
              <TextInput
                style={[styles.textInput, { height: 70 }]}
                placeholder="Street address, city, pincode..."
                multiline
                value={newAddrText}
                onChangeText={setNewAddrText}
              />

              <View style={styles.modalBtnRow}>
                <Pressable style={styles.cancelBtn} onPress={() => setShowAddressModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable style={styles.saveBtn} onPress={handleAddAddress}>
                  <Text style={styles.saveBtnText}>Save Address</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
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

  // Header Card
  profileHeaderCard: {
    flexDirection: isWeb ? 'row' : 'column',
    alignItems: isWeb ? 'center' : 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  proBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#E03126',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  proPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E03126',
  },
  userEmailText: {
    fontSize: 13,
    color: '#64748B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  // Profiler Card
  profilerCard: {
    flexDirection: isWeb ? 'row' : 'column',
    alignItems: isWeb ? 'center' : 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 18,
    gap: 14,
  },
  profilerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profilerTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.6,
  },
  profilerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  profilerSub: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 17,
  },
  openProfilerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  openProfilerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Editable Box
  editInfoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 12,
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  inputGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputCol: {
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8F9FA',
  },

  // Sections
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 12,
  },
  prefGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 16,
  },
  prefBox: {
    flex: 1,
    gap: 6,
  },
  prefLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  prefPillActive: {
    backgroundColor: '#E03126',
    borderColor: '#E03126',
  },
  prefPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  prefPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Chips
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  chipWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fastChip: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fastChipActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  fastChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  fastChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  favChip: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  favChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E03126',
  },
  cuisineChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cuisineChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },

  // Addresses
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addAddrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E03126',
  },
  addressesGrid: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 12,
  },
  addressCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  addrTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addrLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addrLabelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  defaultBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  addrText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  removeAddrBtn: {
    marginTop: 4,
  },
  removeAddrText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Survey
  surveyList: {
    gap: 10,
  },
  surveyItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  surveyQ: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  surveyA: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },

  // Account Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingSub: {
    fontSize: 12,
    color: '#64748B',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#E03126',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  resetProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  resetProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    backgroundColor: '#E03126',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
