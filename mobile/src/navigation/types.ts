import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Today: undefined;
  Calendar: undefined;
  Insights: undefined;
  Learn: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  LogCycle: undefined;
  Backfill: undefined;
  CycleDetail: { cycleId: string };
  DayDetail: { date: string };
  SymptomLog: { date?: string } | undefined;
  SymptomHistory: undefined;
  Accuracy: undefined;
  Settings: undefined;
};
