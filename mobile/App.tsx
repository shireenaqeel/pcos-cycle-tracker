import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { getOrCreateProfile } from './src/db/profile';
import type { RootStackParamList } from './src/navigation/types';
import { AccuracyScreen } from './src/screens/AccuracyScreen';
import { BackfillScreen } from './src/screens/BackfillScreen';
import { CycleDetailScreen } from './src/screens/CycleDetailScreen';
import { LearnScreen } from './src/screens/LearnScreen';
import { SymptomLogScreen } from './src/screens/SymptomLogScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LogCycleScreen } from './src/screens/LogCycleScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { colors } from './src/theme';
import type { UserProfile } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getOrCreateProfile().then(setProfile);
  }, []);

  if (profile === null) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          // A null phenotype means onboarding has never run; 'unknown' means it ran and
          // the answer was "not sure", which is an answer, not a reason to ask again.
          initialRouteName={profile.phenotype === null ? 'Onboarding' : 'Home'}
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
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Your cycle' }} />
          <Stack.Screen
            name="Backfill"
            component={BackfillScreen}
            options={{ title: 'Past cycles' }}
          />
          <Stack.Screen
            name="LogCycle"
            component={LogCycleScreen}
            options={{ title: 'Log a cycle' }}
          />
          <Stack.Screen
            name="CycleDetail"
            component={CycleDetailScreen}
            options={{ title: 'Edit cycle' }}
          />
          <Stack.Screen
            name="SymptomLog"
            component={SymptomLogScreen}
            options={{ title: 'Symptoms' }}
          />
          <Stack.Screen name="Learn" component={LearnScreen} options={{ title: 'Learn' }} />
          <Stack.Screen
            name="Accuracy"
            component={AccuracyScreen}
            options={{ title: 'Track record' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
