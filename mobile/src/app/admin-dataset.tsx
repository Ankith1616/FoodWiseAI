import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../components/sidebar';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function AdminDatasetScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stats' | 'samples' | 'export'>('stats');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    fetchStats();
    fetchSamples('all');
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/dataset/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.warn('Failed to fetch dataset stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSamples = async (filterClass: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/dataset/samples?sample_class=${filterClass}`);
      const data = await res.json();
      setSamples(data);
    } catch (e) {
      console.warn('Failed to fetch samples:', e);
    }
  };

  const handleFilterChange = (filterClass: string) => {
    setSelectedFilter(filterClass);
    fetchSamples(filterClass);
  };

  const handleExportZip = () => {
    const exportUrl = `${API_BASE_URL}/admin/dataset/export`;
    if (Platform.OS === 'web') {
      window.open(exportUrl, '_blank');
    } else {
      Alert.alert('Dataset Export', `Open in browser to download: ${exportUrl}`);
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Dataset Admin & Exporter', headerShown: false }} />
      <Sidebar />

      <View style={styles.main}>
        {/* Top Navbar */}
        <View style={styles.topNavbar}>
          <View style={styles.titleGroup}>
            <Text style={styles.navbarTitle}>Dataset Admin & Exporter 📊</Text>
            <Text style={styles.navbarSubtitle}>
              Research Dataset Collection, Hard-Negative Inspector & Anonymous Exporter
            </Text>
          </View>

          <Pressable style={styles.exportBtnHeader} onPress={handleExportZip}>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exportBtnHeaderText}>Export Dataset ZIP</Text>
          </Pressable>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'stats' && styles.tabBtnActive]}
            onPress={() => setActiveTab('stats')}
          >
            <Ionicons name="pie-chart-outline" size={16} color={activeTab === 'stats' ? '#2563EB' : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Dataset Stats</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'samples' && styles.tabBtnActive]}
            onPress={() => setActiveTab('samples')}
          >
            <Ionicons name="list-outline" size={16} color={activeTab === 'samples' ? '#2563EB' : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'samples' && styles.tabTextActive]}>Sample Inspector</Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, activeTab === 'export' && styles.tabBtnActive]}
            onPress={() => setActiveTab('export')}
          >
            <Ionicons name="cloud-download-outline" size={16} color={activeTab === 'export' ? '#2563EB' : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'export' && styles.tabTextActive]}>Export & Dictionary</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {loading ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* TAB 1: DATASET STATS */}
              {activeTab === 'stats' && stats && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionHeader}>Dataset Overview Metrics</Text>
                  
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statVal}>{stats.total_foods}</Text>
                      <Text style={styles.statLabel}>Food Catalog Items</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statVal}>{stats.total_users}</Text>
                      <Text style={styles.statLabel}>Anonymized Users</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statVal}>{stats.total_interactions}</Text>
                      <Text style={styles.statLabel}>Total Interactions</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={[styles.statVal, { color: '#892CDC' }]}>
                        {stats.sample_breakdown?.hard_negative || 0}
                      </Text>
                      <Text style={styles.statLabel}>Hard-Negative Samples</Text>
                    </View>
                  </View>

                  <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Sample Class Distribution</Text>
                  
                  <View style={styles.breakdownRow}>
                    <View style={[styles.breakdownBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                      <Text style={[styles.breakdownBadgeTitle, { color: '#166534' }]}>Positive Samples</Text>
                      <Text style={[styles.breakdownBadgeVal, { color: '#15803D' }]}>
                        {stats.sample_breakdown?.positive || 0} ({stats.positive_rate_pct}%)
                      </Text>
                    </View>

                    <View style={[styles.breakdownBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                      <Text style={[styles.breakdownBadgeTitle, { color: '#991B1B' }]}>Negative Samples</Text>
                      <Text style={[styles.breakdownBadgeVal, { color: '#DC2626' }]}>
                        {stats.sample_breakdown?.negative || 0}
                      </Text>
                    </View>

                    <View style={[styles.breakdownBadge, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}>
                      <Text style={[styles.breakdownBadgeTitle, { color: '#6B21A8' }]}>Hard-Negative Samples</Text>
                      <Text style={[styles.breakdownBadgeVal, { color: '#892CDC' }]}>
                        {stats.sample_breakdown?.hard_negative || 0}
                      </Text>
                    </View>

                    <View style={[styles.breakdownBadge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                      <Text style={[styles.breakdownBadgeTitle, { color: '#334155' }]}>Neutral Impressions</Text>
                      <Text style={[styles.breakdownBadgeVal, { color: '#475569' }]}>
                        {stats.sample_breakdown?.neutral || 0}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 2: SAMPLE INSPECTOR */}
              {activeTab === 'samples' && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionHeader}>Interaction Samples Inspector</Text>
                  <Text style={styles.sectionSub}>
                    Inspect real application user interactions classified into Positive, Negative, Neutral, and Hard-Negative research samples.
                  </Text>

                  {/* Filter Pills */}
                  <View style={styles.filterRow}>
                    {['all', 'positive', 'negative', 'hard_negative', 'neutral'].map((f) => (
                      <Pressable
                        key={f}
                        style={[styles.filterChip, selectedFilter === f && styles.filterChipActive]}
                        onPress={() => handleFilterChange(f)}
                      >
                        <Text style={[styles.filterChipText, selectedFilter === f && styles.filterChipTextActive]}>
                          {f === 'hard_negative' ? 'Hard-Negative' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {samples.map((item, idx) => (
                    <View key={item.interaction_id || idx} style={styles.sampleCard}>
                      <View style={styles.sampleCardHeader}>
                        <Text style={styles.sampleDishName}>{item.food_name}</Text>
                        <View
                          style={[
                            styles.classBadge,
                            item.sample_class === 'positive' && { backgroundColor: '#DCFCE7' },
                            item.sample_class === 'negative' && { backgroundColor: '#FEE2E2' },
                            item.sample_class === 'hard_negative' && { backgroundColor: '#F3E8FF' },
                            item.sample_class === 'neutral' && { backgroundColor: '#F1F5F9' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.classBadgeText,
                              item.sample_class === 'positive' && { color: '#166534' },
                              item.sample_class === 'negative' && { color: '#991B1B' },
                              item.sample_class === 'hard_negative' && { color: '#6B21A8' },
                              item.sample_class === 'neutral' && { color: '#475569' },
                            ]}
                          >
                            {item.sample_class.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.sampleDetails}>
                        User ID: {item.user_id} • Action: <Text style={{ fontWeight: '800' }}>{item.interaction_type}</Text> • Dwell Time: {item.dwell_time_sec}s
                      </Text>
                      <Text style={styles.sampleSubDetails}>
                        Category: {item.category} • Source: {item.recommendation_source} • User Diets: {item.user_diet}
                      </Text>

                      {item.sample_class === 'hard_negative' && (
                        <View style={styles.hardNegBanner}>
                          <Ionicons name="alert-circle-outline" size={14} color="#892CDC" />
                          <Text style={styles.hardNegBannerText}>
                            Hard-Negative: Item matched user calorie & diet thresholds, but user explicitly rejected it!
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* TAB 3: EXPORT & DATA DICTIONARY */}
              {activeTab === 'export' && (
                <View style={styles.contentSection}>
                  <Text style={styles.sectionHeader}>Anonymous Research Dataset Exporter</Text>
                  
                  <View style={styles.privacyBanner}>
                    <Ionicons name="shield-checkmark" size={24} color="#166534" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.privacyTitle}>100% Anonymized Privacy Guarantee</Text>
                      <Text style={styles.privacyText}>
                        Zero personal identifiable information (PII) is included in research exports. Real names, email addresses, passwords, phone numbers, exact street addresses, and GPS coordinates are strictly excluded.
                      </Text>
                    </View>
                  </View>

                  <Pressable style={styles.bigExportBtn} onPress={handleExportZip}>
                    <Ionicons name="cloud-download" size={20} color="#FFFFFF" />
                    <Text style={styles.bigExportBtnText}>Download Research Dataset ZIP Bundle</Text>
                  </Pressable>

                  <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Export Package Contents (ZIP)</Text>

                  {[
                    { name: 'food_catalog.csv', desc: 'Food metadata (food_id, name, cuisine, category, is_veg, price, calories, macros, restaurant, image_id)' },
                    { name: 'user_preferences.csv', desc: 'Anonymous user metabolic profiles (user_id UUID, dietary_protocols, max_calories, spice_tolerance, macro_ratios)' },
                    { name: 'user_food_interactions.csv', desc: 'User interaction logs (interaction_id, user_id, food_id, action, rating, dwell_time, sample_class)' },
                    { name: 'recommendation_feedback.csv', desc: 'Explicit user feedback and rejection reasons' },
                    { name: 'local_foods.csv', desc: 'Local regional food specialties, cultural notes, and seasonality' },
                    { name: 'image_metadata.csv', desc: 'Connected image metadata (image_id, filename, format, resolution, size_kb)' },
                    { name: 'data_dictionary.csv', desc: 'Field-by-field schema data dictionary defining all data types and primary/foreign keys' },
                    { name: 'README.md', desc: 'Complete research guide, citation guidelines, and interaction taxonomy documentation' },
                    { name: 'food_images/', desc: 'Directory containing high-resolution food images referenced by image_id' },
                  ].map((file) => (
                    <View key={file.name} style={styles.fileRow}>
                      <Ionicons name="document-text-outline" size={18} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileName}>{file.name}</Text>
                        <Text style={styles.fileDesc}>{file.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  main: {
    flex: 1,
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleGroup: {
    flex: 1,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  navbarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  exportBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    gap: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
  },

  scroll: {
    padding: 20,
  },
  contentSection: {
    maxWidth: 900,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  statVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },

  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  breakdownBadge: {
    flex: 1,
    minWidth: 180,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  breakdownBadgeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownBadgeVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  sampleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  sampleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sampleDishName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  classBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sampleDetails: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  sampleSubDetails: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  hardNegBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  hardNegBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B21A8',
  },

  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  privacyText: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },

  bigExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  bigExportBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  fileDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
