import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: Network.NetworkStateType | null;
}

export function useNetwork() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
  });

  useEffect(() => {
    let isMounted = true;

    // Initial check
    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (isMounted) {
          setNetworkState({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable ?? false,
            type: state.type ?? null,
          });
        }
      } catch {
        // Default to connected if check fails
        if (isMounted) {
          setNetworkState(prev => ({ ...prev }));
        }
      }
    };

    checkNetwork();

    // Poll every 5 seconds for network changes
    const interval = setInterval(checkNetwork, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline: networkState.isConnected && networkState.isInternetReachable,
    isConnected: networkState.isConnected,
    networkType: networkState.type,
  };
}
