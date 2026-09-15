/**
 * FoodWiseAI — Web Top Navigation Bar
 * Matches the reference screenshot: white bg, brand subtext, Veg/Non-Veg pills, notification badge, profile dropdown.
 */
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';

import { Pressable, View, StyleSheet, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <TopNavBar>
          <TabTrigger name="home" href="/" asChild>
            <NavLink>Explore</NavLink>
          </TabTrigger>
          <TabTrigger name="profiler" href="/profiler" asChild>
            <NavLink>Health Goals</NavLink>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <NavLink>Insights</NavLink>
          </TabTrigger>
          <TabTrigger name="food" href="/food" asChild>
            <NavLink>Food</NavLink>
          </TabTrigger>
          <TabTrigger name="orders" href="/orders" asChild>
            <NavLink>Orders</NavLink>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <NavLink>Profile</NavLink>
          </TabTrigger>
        </TopNavBar>
      </TabList>
    </Tabs>
  );
}

/** Individual nav link pill */
export function NavLink({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Text style={[styles.navLink, isFocused && styles.navLinkActive]}>
        {children}
      </Text>
      {isFocused && <View style={styles.navLinkUnderline} />}
    </Pressable>
  );
}

/** Top bar container */
export function TopNavBar(props: TabListProps) {
  const { dietaryMode, setDietaryMode } = useAppStore();

  return (
    <View {...props} style={styles.topBar}>
      {/* Brand & Tagline */}
      <View style={styles.brandContainer}>
        <Text style={styles.brand}>FoodWise AI</Text>
        <Text style={styles.brandSub}>Eat Smart, Live Better</Text>
      </View>

      {/* Nav links */}
      <View style={styles.navLinks}>
        {props.children}
      </View>

      {/* Right actions matching exact image */}
      <View style={styles.rightActions}>
        {/* Bell Notification with red count badge */}
        <Pressable style={styles.notifBtn} onPress={() => useRouter().push('/orders')}>
          <Ionicons name="notifications" size={16} color="#475569" />
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>3</Text>
          </View>
        </Pressable>

        {/* Green Veg Pill */}
        <Pressable
          style={[styles.vegPill, dietaryMode === 'veg' && styles.vegPillActive]}
          onPress={() => setDietaryMode(dietaryMode === 'veg' ? 'all' : 'veg')}
        >
          <View style={styles.vegIconBox}>
            <View style={styles.vegDotInside} />
          </View>
          <Text style={[styles.vegPillText, dietaryMode === 'veg' && styles.vegPillTextActive]}>
            Veg
          </Text>
        </Pressable>

        {/* Red Non-Veg Pill */}
        <Pressable
          style={[styles.nonVegPill, dietaryMode === 'non-veg' && styles.nonVegPillActive]}
          onPress={() => setDietaryMode(dietaryMode === 'non-veg' ? 'all' : 'non-veg')}
        >
          <View style={styles.nonVegIconBox}>
            <View style={styles.nonVegTriangleInside} />
          </View>
          <Text style={[styles.nonVegPillText, dietaryMode === 'non-veg' && styles.nonVegPillTextActive]}>
            Non-Veg
          </Text>
        </Pressable>

        {/* User Profile Avatar with dropdown arrow */}
        <Pressable style={styles.userProfileBtn} onPress={() => useRouter().push('/profile')}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80' }}
            style={styles.userAvatarImg}
          />
          <Ionicons name="chevron-down" size={13} color="#475569" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingHorizontal: 28,
    paddingVertical: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  brandContainer: {
    marginRight: 32,
  },
  brand: {
    fontSize: 19,
    fontWeight: '900',
    color: '#E03126',
    letterSpacing: -0.4,
  },
  brandSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: -2,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 24,
    flex: 1,
    alignItems: 'center',
  },
  navLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  navLinkActive: {
    color: '#E03126',
    fontWeight: '800',
  },
  navLinkUnderline: {
    height: 3,
    backgroundColor: '#E03126',
    borderRadius: 2,
    marginTop: 4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E03126',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  vegPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    cursor: 'pointer',
  } as any,
  vegPillActive: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
  },
  vegIconBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  vegDotInside: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#15803D',
  },
  vegPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  vegPillTextActive: {
    color: '#FFFFFF',
  },
  nonVegPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    cursor: 'pointer',
  } as any,
  nonVegPillActive: {
    backgroundColor: '#E03126',
    borderColor: '#B91C1C',
  },
  nonVegIconBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  nonVegTriangleInside: {
    width: 4,
    height: 4,
    backgroundColor: '#B91C1C',
    borderRadius: 1,
  },
  nonVegPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  nonVegPillTextActive: {
    color: '#FFFFFF',
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  userAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});
