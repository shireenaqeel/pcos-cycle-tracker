import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Shows what actually broke instead of a bare red box.
 *
 * Deliberately styled without the theme: if the failure is in theming or font
 * loading, anything that reads from those would fail here too and hide the
 * message. Plain colours and the system font always render.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
    console.error('Caught by ErrorBoundary:', error, info.componentStack);
  }

  render() {
    const { error, componentStack } = this.state;
    if (error === null) return this.props.children;

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Something broke on startup</Text>
        <Text style={styles.label}>Message</Text>
        <Text style={styles.mono}>{error.message}</Text>

        {error.stack !== undefined && (
          <>
            <Text style={styles.label}>Stack</Text>
            <Text style={styles.mono}>{error.stack.split('\n').slice(0, 12).join('\n')}</Text>
          </>
        )}

        {componentStack !== null && (
          <>
            <Text style={styles.label}>Where</Text>
            <Text style={styles.mono}>{componentStack.split('\n').slice(0, 10).join('\n')}</Text>
          </>
        )}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1114',
    flexGrow: 1,
    gap: 10,
    padding: 24,
    paddingTop: 72,
  },
  heading: {
    color: '#FFD9E1',
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    color: '#9A8A90',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  mono: {
    color: '#F2E8EB',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
