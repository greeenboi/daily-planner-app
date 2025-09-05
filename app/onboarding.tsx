import React from "react";
import { View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card/index.web";
import { VStack } from "@/components/ui/vstack/index.web";


export default function Onboarding() {
  const router = useRouter();

  const completeOnboarding = async () => {
    await SecureStore.setItemAsync("onboarding_completed", "true");
    // After completing, route to auth flow
    router.replace("/(auth)/sign-in");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1E1E1E" }}>
      <Center className="px-4 flex-1">
        <Card size="md" variant="elevated" className="p-4 gap-3 border-0">
          <VStack space="sm">
            <Heading size="lg">Welcome to EaseIn</Heading>
            <Text size="sm" className="text-typography-500">
              A quick setup to tailor your planner. You can change these later.
            </Text>
            <Button action="primary" variant="solid" onPress={completeOnboarding}>
              <ButtonText>Finish onboarding</ButtonText>
            </Button>
          </VStack>
        </Card>
      </Center>
    </View>
  );
}
