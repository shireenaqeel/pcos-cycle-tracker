import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { getOrCreateProfile } from './src/db/profile';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { AccuracyScreen } from './src/screens/AccuracyScreen';
import { BackfillScreen } from './src/screens/BackfillScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { CycleDetailScreen } from './src/screens/CycleDetailScreen';
import { DayDetailScreen } from './src/screens/DayDetailScreen';
import { InsightsScreen } from './src/screens/InsightsScreen';
import { LearnScreen } from './src/screens/LearnScreen';
import { LogCycleScreen } from './src/screens/LogCycleScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SymptomHistoryScreen } from './src/screens/SymptomHistoryScreen';
import { SymptomLogScreen } from './src/screens/SymptomLogScreen';
import { TodayScreen } from './src/screens/TodayScreen';
import { useThemeColors } from './src/theme';
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

export default function App() {
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getOrCreateProfile().then(setProfile);
  }, []);

  if (profile === null) {
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
            name="SymptomLog"
            component={SymptomLogScreen}
            options={{ title: 'Symptoms', presentation: 'modal' }}
          />
          <Stack.Screen
            name="SymptomHistory"
            component={SymptomHistoryScreen}
            options={{ title: 'Symptom history' }}
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
