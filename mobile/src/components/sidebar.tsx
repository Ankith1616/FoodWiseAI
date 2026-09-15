/**
 * FoodWiseAI — Left Sidebar Navigation (Web)
 * Matches the reference design: white sidebar, orange active state, logo on top.
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  Brand,
  Surface,
  TextColors,
  Radius,
  Spacing,
  SidebarWidth,
} from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/useAppStore';

type NavItem = {
  label:  string;
  href:   '/' | '/food' | '/explore' | '/orders' | '/profile' | '/dataset' | '/admin-dataset';
  icon:   keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',        href: '/',             icon: 'grid-outline'          },
  { label: 'Food',             href: '/food',         icon: 'fast-food-outline'      },
  { label: 'Recommendations',  href: '/explore',      icon: 'sparkles-outline'      },
  { label: 'Dataset Gallery',  href: '/dataset',      icon: 'images-outline'        },
  { label: 'Dataset Admin',    href: '/admin-dataset',icon: 'analytics-outline'     },
  { label: 'Orders',           href: '/orders',       icon: 'receipt-outline'        },
  { label: 'Profile',          href: '/profile',      icon: 'person-outline'         },
];

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { resetProfile } = useAppStore();

  return (
    <View style={styles.sidebar}>
      {/* Brand */}
      <View style={styles.brand}>
        <Text style={styles.brandIcon}>🍴</Text>
        <View>
          <Text style={styles.brandName}>FoodWise AI</Text>
          <Text style={styles.brandSub}>Premium Insights</Text>
        </View>
      </View>

      {/* Nav items */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href ||
            (item.href === '/' && pathname === '');
          return (
            <Pressable
              key={item.href}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.href)}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={active ? Brand.primary : TextColors.muted}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Upgrade to Pro */}
      <Pressable style={styles.upgradeBtn}>
        <Text style={styles.upgradeText}>Upgrade to Pro</Text>
      </Pressable>

      {/* Logout */}
      <Pressable
        style={styles.logoutRow}
        onPress={resetProfile}
      >
        <Ionicons name="log-out-outline" size={16} color={TextColors.muted} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width:           SidebarWidth,
    backgroundColor: Surface.sidebar,
    borderRightWidth:1,
    borderRightColor:Surface.border,
    paddingVertical: Spacing.four,
    paddingHorizontal:Spacing.three,
    height:          '100%',
  },
  brand: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.two,
    marginBottom:    Spacing.five,
  },
  brandIcon: { fontSize: 20 },
  brandName: {
    fontSize:   16,
    fontWeight: '800',
    color:      Brand.primary,
  },
  brandSub: {
    fontSize: 10,
    color:    TextColors.muted,
  },
  nav: {
    gap: Spacing.one,
  },
  navItem: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius:    Radius.sm,
  },
  navItemActive: {
    backgroundColor: Brand.primaryLight,
  },
  navLabel: {
    fontSize:   14,
    color:      TextColors.muted,
    fontWeight: '500',
  },
  navLabelActive: {
    color:      Brand.primary,
    fontWeight: '700',
  },
  upgradeBtn: {
    borderWidth:     1.5,
    borderColor:     Brand.primary,
    borderRadius:    Radius.sm,
    paddingVertical: 10,
    alignItems:      'center',
    marginBottom:    Spacing.two,
  },
  upgradeText: {
    color:      Brand.primary,
    fontWeight: '700',
    fontSize:   13,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.one,
    paddingTop:    Spacing.two,
  },
  logoutText: {
    color:    TextColors.muted,
    fontSize: 13,
  },
});
