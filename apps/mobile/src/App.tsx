import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { kuliApi } from './lib/api';
import { runtimeConfig, runtimeReadiness } from './config/runtime';
import { colors, radii, spacing } from './theme';

type TabRoute = {
  key: string;
  label: string;
  route: string;
  detail: string;
};

const clientTabs: TabRoute[] = [
  { key: 'client-home', label: 'Home', route: '/client/home', detail: 'Active request card before new booking.' },
  { key: 'client-request', label: 'Request', route: '/client/request/new', detail: 'Quote, location, load, and candidate flow.' },
  { key: 'client-history', label: 'History', route: '/client/history', detail: 'Completed trips, ratings, reports, and receipts.' },
  { key: 'client-notifications', label: 'Alerts', route: '/client/notifications', detail: 'In-app updates and read states.' }
];

const ownerTabs: TabRoute[] = [
  { key: 'owner-home', label: 'Home', route: '/owner/home', detail: 'Vehicle status and availability prompt.' },
  { key: 'owner-vehicles', label: 'Vehicles', route: '/owner/vehicles', detail: 'Registration, documents, and verification status.' },
  { key: 'owner-offers', label: 'Offers', route: '/owner/offers', detail: 'First-accept-wins offer inbox.' },
  { key: 'owner-earnings', label: 'Earnings', route: '/owner/earnings', detail: 'Cash confirmation and rating summary.' }
];

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000
    }
  }
});

function StatusPill({ tone, children }: { tone: 'ready' | 'warn' | 'blocked'; children: string }) {
  return (
    <View style={[styles.pill, tone === 'ready' && styles.pillReady, tone === 'warn' && styles.pillWarn, tone === 'blocked' && styles.pillBlocked]}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

function HealthCard() {
  const healthQuery = useQuery({
    queryKey: ['api-health'],
    queryFn: () => kuliApi.health()
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>API Connection</Text>
        <StatusPill tone={healthQuery.isSuccess ? 'ready' : healthQuery.isError ? 'blocked' : 'warn'}>
          {healthQuery.isSuccess ? 'Ready' : healthQuery.isError ? 'Check API' : 'Checking'}
        </StatusPill>
      </View>
      <Text style={styles.muted}>{runtimeConfig.apiBaseUrl}</Text>
      {healthQuery.isError ? <Text style={styles.errorText}>Backend is not reachable from this runtime yet.</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => healthQuery.refetch()} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Check health</Text>
      </Pressable>
    </View>
  );
}

function FoundationScreen({ title, route, detail }: { title: string; route: string; detail: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{route}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{detail}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phase 0 route contract</Text>
          <Text style={styles.muted}>This placeholder is wired into real navigation so later phases can replace the body without changing route ownership.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ClientTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      {clientTabs.map((tab) => (
        <Tab.Screen key={tab.key} name={tab.label}>
          {() => <FoundationScreen title={`Client ${tab.label}`} route={tab.route} detail={tab.detail} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}

function OwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      {ownerTabs.map((tab) => (
        <Tab.Screen key={tab.key} name={tab.label}>
          {() => <FoundationScreen title={`Owner ${tab.label}`} route={tab.route} detail={tab.detail} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}

function WelcomeScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const readinessItems = useMemo(
    () => [
      { label: 'API base URL', ready: runtimeReadiness.hasApiBaseUrl },
      { label: 'Supabase URL', ready: runtimeReadiness.hasSupabaseUrl },
      { label: 'Supabase anon key', ready: runtimeReadiness.hasSupabaseAnonKey }
    ],
    []
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>KULI mobile</Text>
        <Text style={styles.title}>Truck logistics without guesswork.</Text>
        <Text style={styles.copy}>
          Phase 0 sets up the real Expo app, API health checks, Supabase client, guarded route placeholders, and role-specific tab shells.
        </Text>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Client')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Client shell</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Owner')} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Owner shell</Text>
          </Pressable>
        </View>

        <HealthCard />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Runtime readiness</Text>
          {readinessItems.map((item) => (
            <View key={item.label} style={styles.readinessRow}>
              <Text style={styles.readinessText}>{item.label}</Text>
              <StatusPill tone={item.ready ? 'ready' : 'blocked'}>{item.ready ? 'Set' : 'Missing'}</StatusPill>
            </View>
          ))}
        </View>

        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline and retry states are reserved here for request, message, report, and payment commands in later phases.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AppContent() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primaryDeep },
          headerTintColor: '#fffaf0',
          headerTitleStyle: { fontWeight: '700' }
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'KULI' }} />
        <Stack.Screen name="Client" component={ClientTabs} options={{ title: 'Client workspace' }} />
        <Stack.Screen name="Owner" component={OwnerTabs} options={{ title: 'Owner workspace' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const tabScreenOptions = {
  headerStyle: { backgroundColor: colors.primaryDeep },
  headerTintColor: '#fffaf0',
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    minHeight: 62,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopColor: colors.line
  }
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38
  },
  copy: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryButtonText: {
    color: '#fffaf0',
    fontSize: 15,
    fontWeight: '800'
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800'
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800'
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '700'
  },
  pill: {
    borderRadius: radii.sm,
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm
  },
  pillReady: {
    backgroundColor: colors.green
  },
  pillWarn: {
    backgroundColor: colors.amber
  },
  pillBlocked: {
    backgroundColor: colors.red
  },
  pillText: {
    color: '#fffaf0',
    fontSize: 12,
    fontWeight: '800'
  },
  readinessRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  readinessText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '700'
  },
  offlineBanner: {
    backgroundColor: '#efe1c5',
    borderColor: '#d7bc85',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md
  },
  offlineText: {
    color: '#5f4b21',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20
  }
});
