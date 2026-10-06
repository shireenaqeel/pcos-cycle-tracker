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
  /** Add a period, or edit one by id. `startDate` prefills a date tapped on the calendar. */
  Period: { cycleId?: string; startDate?: string } | undefined;
  Backfill: undefined;
  DayDetail: { date: string };
  CheckIn: { date?: string } | undefined;
  SymptomHistory: undefined;
  Accuracy: undefined;
  Settings: undefined;
};
