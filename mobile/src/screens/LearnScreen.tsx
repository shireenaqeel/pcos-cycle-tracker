import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Blob, SectionLabel, Squish } from '../components/Soft';
import { contentForPhenotype } from '../content';
import { getOrCreateProfile } from '../db/profile';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import {
  radius,
  spacing,
  typography,
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
} from '../theme';
import type { EducationContent, Phenotype } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Learn'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function LearnScreen(_props: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const [phenotype, setPhenotype] = useState<Phenotype | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getOrCreateProfile().then((profile) => {
      setPhenotype(profile.phenotype);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <View style={styles.container} />;

  const articles = contentForPhenotype(phenotype);
  const tints = [colors.petal, colors.sage, colors.apricot, colors.lilac];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerWrap}>
        <Blob color={colors.apricot} size={200} style={styles.blob} />
        <Text style={styles.title}>Worth knowing</Text>
        <Text style={styles.intro}>
          Written for the pattern you described. Every claim cites where it came from, so you can
          check it rather than take this app's word for it.
        </Text>
      </View>

      {articles.map((article, index) => (
        <Article key={article.id} article={article} tint={tints[index % tints.length]} />
      ))}
    </ScrollView>
  );
}

function Article({ article, tint }: { article: EducationContent; tint: string }) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    setExpanded((open) => {
      Animated.spring(spin, { toValue: open ? 0 : 1, useNativeDriver: true, speed: 16 }).start();
      return !open;
    });
  }, [spin]);

  return (
    <View style={[styles.card, { backgroundColor: tint }]}>
      <Squish onPress={toggle} haptic={false}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{article.title}</Text>
          <Animated.Text
            style={[
              styles.chevron,
              {
                transform: [
                  {
                    rotate: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '90deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            ›
          </Animated.Text>
        </View>
      </Squish>

      {expanded && (
        <View style={styles.body}>
          {article.body.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}

          <SectionLabel>Sources</SectionLabel>
          {article.citations.map((citation, index) => (
            <Text key={index} style={styles.citation}>
              {citation}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flexGrow: 1,
      gap: spacing.sm,
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    headerWrap: {
      gap: spacing.xs,
      paddingBottom: spacing.sm,
    },
    blob: {
      opacity: 0.35,
      position: 'absolute',
      right: -70,
      top: -60,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    intro: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    card: {
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    cardHead: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    cardTitle: {
      ...typography.strong,
      color: colors.text,
      flex: 1,
    },
    chevron: {
      ...typography.heading,
      color: colors.text,
    },
    body: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    paragraph: {
      ...typography.body,
      color: colors.text,
    },
    citation: {
      ...typography.micro,
      color: colors.textMuted,
    },
  });
