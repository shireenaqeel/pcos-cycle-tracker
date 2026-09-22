import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { contentForPhenotype } from '../content';
import { getOrCreateProfile } from '../db/profile';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { EducationContent, Phenotype } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Learn'>;

export function LearnScreen(_props: Props) {
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Written for the pattern you described. Every claim here cites where it came from, so you
        can check it rather than take this app's word for it.
      </Text>
      {articles.map((article) => (
        <Article key={article.id} article={article} />
      ))}
    </ScrollView>
  );
}

function Article({ article }: { article: EducationContent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setExpanded((open) => !open)}>
        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.toggle}>{expanded ? 'Hide' : 'Read'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {article.body.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}

          <Text style={styles.sourcesLabel}>Sources</Text>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  body: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  paragraph: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  sourcesLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  citation: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 17,
  },
});
