import { StyleSheet, View } from 'react-native';

type Props = {
  rows?: number;
};

export default function ListSkeleton({ rows = 3 }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.lineShort} />
          <View style={styles.line} />
          <View style={styles.lineSmall} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  line: {
    height: 10,
    backgroundColor: '#ece7df',
    borderRadius: 6,
    marginTop: 10,
  },
  lineShort: {
    height: 12,
    width: '50%',
    backgroundColor: '#ece7df',
    borderRadius: 6,
  },
  lineSmall: {
    height: 10,
    width: '35%',
    backgroundColor: '#ece7df',
    borderRadius: 6,
    marginTop: 10,
  },
});
