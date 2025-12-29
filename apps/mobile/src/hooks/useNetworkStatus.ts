import { useEffect, useMemo, useState } from 'react';
import * as Network from 'expo-network';

export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable?: boolean;
  isOffline: boolean;
};

const resolveOffline = (state: Network.NetworkState) => {
  if (state.isConnected === false) {
    return true;
  }
  if (state.isInternetReachable === false) {
    return true;
  }
  return false;
};

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<Network.NetworkState>({
    type: Network.NetworkStateType.UNKNOWN,
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const initial = await Network.getNetworkStateAsync();
      if (isMounted) {
        setState(initial);
      }
    };

    load();

    const subscription = Network.addNetworkStateListener((next) => {
      setState(next);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return useMemo(
    () => ({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? undefined,
      isOffline: resolveOffline(state),
    }),
    [state]
  );
}
