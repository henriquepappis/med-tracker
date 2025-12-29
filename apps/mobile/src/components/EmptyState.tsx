import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  message?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, message, action }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    color: '#6a6660',
    textAlign: 'center',
  },
  action: {
    marginTop: 14,
  },
});
