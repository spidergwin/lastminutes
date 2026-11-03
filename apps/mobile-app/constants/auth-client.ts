import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import Constants from 'expo-constants';

// Use dev machine IP for physical device testing
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
const DEV_MACHINE_IP = debuggerHost || 'localhost';

export const authClient = createAuthClient({
  baseURL: `http://${DEV_MACHINE_IP}:3000`, // Point to the Next.js auth core
  plugins: [
    expoClient({
      scheme: "lastminutes",
      storagePrefix: "lastminutes",
      storage: SecureStore,
    }),
  ],
});
