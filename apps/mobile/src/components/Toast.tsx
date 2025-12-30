import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ToastType = 'success' | 'error';

type ToastProps = {
  message: string;
  type?: ToastType;
  durationMs?: number;
  onHide?: () => void;
};

export default function Toast({ message, type = 'success', durationMs = 2500, onHide }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
      onHide?.();
    }, durationMs);

    return () => clearTimeout(timeout);
  }, [durationMs, onHide]);

  const containerStyle = useMemo(
    () => [styles.container, type === 'error' ? styles.error : styles.success],
    [type]
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={containerStyle}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  success: {
    backgroundColor: '#1b1b1b',
  },
  error: {
    backgroundColor: '#b00020',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
});
