import { Svg, Rect, Path } from 'react-native-svg';

type Props = {
  size?: number;
};

export default function Logo({ size = 96 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <Rect x="20" y="24" width="88" height="36" rx="18" fill="#1b1b1b" />
      <Rect x="20" y="68" width="88" height="36" rx="18" fill="#f0ede8" stroke="#1b1b1b" strokeWidth="4" />
      <Path
        d="M46 46 L58 58 L82 34"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
