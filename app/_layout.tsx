import { Stack } from "expo-router";

import { authClient } from "@/lib/auth-client";

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

export default function RootLayout() {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session;

  return (
    
    <GluestackUIProvider mode="light">
      <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
    </GluestackUIProvider>
  
  );
}
