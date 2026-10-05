import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { getOrCreateProfile, setTheme } from './src/db/profile';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { AccuracyScreen } from './src/screens/AccuracyScreen';
import { BackfillScreen } from './src/screens/BackfillScreen';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { CycleDetailScreen } from './src/screens/CycleDetailScreen';
import { DayDetailScreen } from './src/screens/DayDetailScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { LearnScreen } from './src/screens/LearnScreen';
import { LogCycleScreen } from './src/screens/LogCycleScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LockScreen } from './src/screens/LockScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SymptomHistoryScreen } from './src/screens/SymptomHistoryScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { ThemeProvider, useThemeColors } from './src/theme';
import type { UserProfile } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Today: 'today-outline',
  Calendar: 'calendar-outline',
  Insights: 'stats-chart-outline',
  Learn: 'book-outline',
};

function MainTabs() {
  const colors = useThemeColors();

  return (
    <Tabs.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text },
        headerRight: () => (
          <Pressable
            hitSlop={12}
            style={{ paddingHorizontal: 16 }}
            onPress={() => navigation.getParent()?.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.accent} />
          </Pressable>
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="Today" component={TodayScreen} options={{ title: 'Today' }} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
      <Tabs.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ title: 'Your numbers' }}
      />
      <Tabs.Screen name="Learn" component={LearnScreen} options={{ title: 'Learn' }} />
    </Tabs.Navigator>
  );
}

function AppShell({ profile }: { profile: UserProfile }) {
  const [unlocked, setUnlocked] = useState(!profile.appLockEnabled);
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  // Rendering before the fonts resolve would flash the system face and reflow
  // every screen once they land.
  if (!fontsLoaded) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <SafeAreaProvider>
        <LockScreen onUnlock={() => setUnlocked(true)} />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
          colors: {
            ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
            background: colors.background,
            border: colors.border,
            card: colors.surface,
            primary: colors.accent,
            text: colors.text,
          },
        }}
      >
        <Stack.Navigator
          // A null phenotype means onboarding has never run; 'unknown' means it ran and
          // the answer was "not sure", which is an answer, not a reason to ask again.
          initialRouteName={profile.phenotype === null ? 'Onboarding' : 'Main'}
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.accent,
            headerTitleStyle: { color: colors.text },
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="LogCycle"
            component={LogCycleScreen}
            options={{ title: 'Log a period', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Backfill"
            component={BackfillScreen}
            options={{ title: 'Past cycles', presentation: 'modal' }}
          />
          <Stack.Screen
            name="CycleDetail"
            component={CycleDetailScreen}
            options={{ title: 'Edit period' }}
          />
          <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: 'Day' }} />
          <Stack.Screen
            name="CheckIn"
            component={CheckInScreen}
            options={{ title: 'Daily check-in', presentation: 'modal' }}
          />
          <Stack.Screen
            name="SymptomHistory"
            component={SymptomHistoryScreen}
            options={{ title: 'Your check-ins' }}
          />
          <Stack.Screen
            name="Accuracy"
            component={AccuracyScreen}
            options={{ title: 'Track record' }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    getOrCreateProfile().then(setProfile, setLoadError);
  }, []);

  // Opening the database runs migrations against whatever is already on the
  // device. If that fails, say so plainly — an unhandled rejection here would
  // otherwise surface as a bare red box with nothing to act on.
  if (loadError !== null) {
    throw loadError;
  }

  // The palette has to be known before anything paints, or the first frame
  // renders in the wrong theme and then snaps.
  if (profile === null) return null;

  return (
    <ThemeProvider initialTheme={profile.theme} onChange={(next) => void setTheme(next)}>
      <AppShell profile={profile} />
    </ThemeProvider>
  );
}
