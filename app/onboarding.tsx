import React from "react";
import { View, Animated, PanResponder, Easing, Dimensions } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsRightIcon } from "@/components/ui/icon";
// Use platform-agnostic barrel imports so native builds don't try to render web <div> elements
import { Card } from "@/components/ui/card";
import { VStack } from "@/components/ui/vstack";
import BackgroundImage from "@/components/background-image";
import { Image } from "@/components/ui/image";
import { Image as ExpoImage } from "expo-image"; // for svg splash icon


export default function Onboarding() {
  const router = useRouter();

  const slides = React.useMemo(
    () => [
      {
        title: "Welcome to EaseIn",
        body: "Your focused daily planner. Let's show you a few quick things.",
        image: require("../assets/illustrations/idea-girl.png"),
        width: 356,
        height: 345,
      },
      {
        title: "Plan Your Day",
        body: "Capture tasks, goals and routines in one clean timeline.",
        image: require("../assets/illustrations/book-girl.png"),
        width: 375,
        height: 325,
      },
      {
        title: "Stay On Track",
        body: "Smart reminders help you focus on what matters right now.",
        image: require("../assets/illustrations/laptop-girl.png"),
        width: 356,
        height: 340,
      },
      {
        title: "Reflect & Improve",
        body: "Review your day and build consistent habits over time.",
        image: require("../assets/illustrations/rocket-girl.png"),
        width: 356,
        height: 340,
      },
    ],
    [],
  );

  const [index, setIndex] = React.useState(0);
  const last = index === slides.length - 1;
  // Animated position representing fractional slide index
  const position = React.useRef(new Animated.Value(0)).current;

  // Intro animation values
  const introProgress = React.useRef(new Animated.Value(0)).current; // 0 -> 1
  const spinValue = React.useRef(new Animated.Value(0)).current;
  const [introDone, setIntroDone] = React.useState(false);

  React.useEffect(() => {
    // Spin forever
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    // Intro translation + scale sequence
    Animated.timing(introProgress, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIntroDone(true);
    });
  }, [introProgress, spinValue]);

  // Animate position whenever index changes
  React.useEffect(() => {
    Animated.spring(position, {
      toValue: index,
      useNativeDriver: false, // driving layout (left/width)
      friction: 9,
      tension: 80,
    }).start();
  }, [index, position]);

  const completeOnboarding = React.useCallback(async () => {
    await SecureStore.setItemAsync("onboarding_completed", "true");
    router.replace("/(auth)/sign-in");
  }, [router]);

  const handleNext = React.useCallback(() => {
    if (last) {
      void completeOnboarding();
      return;
    }
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [last, completeOnboarding, slides.length]);

  const handlePrev = React.useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const resetOnboarding = async () => {
    await SecureStore.setItemAsync("onboarding_completed", "false");
    setIndex(0);
  };

  // Swipe gesture (horizontal)
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40 && !last) {
          handleNext();
        } else if (g.dx > 40 && index > 0) {
          handlePrev();
        }
      },
    }),
  ).current;

  // Interpolations for progress indicator (morphing dots)
  const dotSize = 8;
  const activeSize = 18; // width when mid-transition (stretch)
  const gap = 8;
  const outputRangeLeft = slides.map((_, i) => i * (dotSize + gap));
  const activeLeft = position.interpolate({
    inputRange: slides.map((_, i) => i),
    outputRange: outputRangeLeft,
  });

  // Stretch effect during transition: use modulo of fractional part by diff to expand width
  const stretchWidth = position.interpolate({
    inputRange: slides.flatMap((_, i) => [i - 0.499, i, i + 0.499]),
    outputRange: slides.flatMap(() => [dotSize, activeSize, dotSize]),
    extrapolate: 'clamp',
  });

  return (
    (() => {
      const screenW = Dimensions.get("window").width;
      const startTop = 90; // initial top-center offset
      const endMargin = 18; // final margin from top/right
      const startSize = 140;
      const endSize = 48;
      const translateX = introProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, (screenW / 2) - endMargin - endSize / 2],
      });
      const translateY = introProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -(startTop - endMargin)],
      });
      const scale = introProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, endSize / startSize],
      });
      const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      });

      if (!introDone) {
        return (
          <View style={{ flex: 1, backgroundColor: "#1E1E1E" }}>
            <BackgroundImage />
            <View style={{ flex: 1 }} pointerEvents="none">
              <Animated.View
                style={{
                  position: "absolute",
                  top: startTop,
                  left: 0,
                  right: 0,
                  alignItems: "center",
                  transform: [{ translateX }, { translateY }, { scale }, { rotate: spin }],
                }}
              >
                <ExpoImage
                  source={require("../assets/splash-icon.svg")}
                  style={{ width: startSize, height: startSize }}
                  contentFit="contain"
                />
              </Animated.View>
            </View>
          </View>
        );
      }

      // After intro: render full onboarding plus persistent spinning icon top-right
      return (
    <View style={{ flex: 1, backgroundColor: "#1E1E1E" }}>
      <BackgroundImage />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: endMargin,
          right: endMargin,
          transform: [{ rotate: spin }],
        }}
      >
        <ExpoImage
          source={require("../assets/splash-icon.svg")}
          style={{ width: endSize, height: endSize }}
          contentFit="contain"
        />
      </Animated.View>
      {/* Parallax / cross-fade illustration layer */}
      <Center pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0">
        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
          {slides.map((s, i) => {
            const opacity = position.interpolate({
              inputRange: [i - 0.75, i, i + 0.75],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            });
            // Parallax: slower horizontal, slight vertical rise
            const translateX = position.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [70, 0, -70],
              extrapolate: 'clamp',
            });
            const translateY = position.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [20, 0, -20],
              extrapolate: 'clamp',
            });
            const scale = position.interpolate({
              inputRange: [i - 1, i, i + 1],
              outputRange: [0.9, 1, 0.9],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={`${s.title}-img`}
                style={{
                  position: 'absolute',
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                }}
              >
                <Image
                  style={{ width: s.width, height: s.height, transform: [{ scale: 0.95 }] }}
                  className={`w-[${s.width}px] h-[${s.height}px]`}
                  source={s.image}
                  alt={`${s.title} illustration`}
                  resizeMode="contain"
                />
              </Animated.View>
            );
          })}
        </View>
      </Center>
      {/* Bottom anchored container */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingBottom: 28,
        }}
      >
        <Card
          size="md"
          variant="ghost"
          className="gap-4 border-0 bg-transparent w-full max-w-[640px] self-center"
          {...panResponder.panHandlers}
        >
          <VStack space="md">
            <View style={{ height: 90, position: 'relative' }}>
              {slides.map((s, i) => {
                const translateX = position.interpolate({
                  inputRange: [i - 1, i, i + 1],
                  outputRange: [40, 0, -40],
                  extrapolate: 'clamp',
                });
                const opacity = position.interpolate({
                  inputRange: [i - 0.7, i, i + 0.7],
                  outputRange: [0, 1, 0],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View
                    key={s.title}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      opacity,
                      transform: [{ translateX }],
                    }}
                  >
                    <VStack space="xs">
                      <Heading size="lg">{s.title}</Heading>
                      <Text size="sm" className="text-typography-500">
                        {s.body}
                      </Text>
                    </VStack>
                  </Animated.View>
                );
              })}
            </View>

            {/* Controls & Progress */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Button
                  onPress={handlePrev}
                  variant="solid"
                  action="primary"
                  isDisabled={index === 0}
                  className="h-12 w-12 rounded-full ml-3 p-0 items-center justify-center bg-white"
                >
                  <Icon
                    as={ChevronLeftIcon}
                    className={`w-5 h-5 text-black ${index === 0 ? 'opacity-40' : 'text-typography-900'}`}
                  />
                </Button>
              </View>
              {/* Progress dots with morphing active indicator */}
              <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                {/* Static dots */}
                {slides.map((s, i) => (
                  <View
                    key={s.title}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: 999,
                      backgroundColor: '#ffffff',
                      opacity: 0.25,
                      marginHorizontal: gap / 2,
                    }}
                  />
                ))}
                {/* Active morphing indicator */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 4 + (gap / 2),
                    height: dotSize,
                    borderRadius: 999,
                    backgroundColor: '#ffffff',
                    transform: [
                      {
                        translateX: Animated.add(
                          activeLeft,
                          new Animated.Value(0), // placeholder for potential offset adjustments
                        ),
                      },
                    ],
                    width: stretchWidth,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Button
                  onPress={handleNext}
                  variant="solid"
                  action="primary"
                  accessibilityLabel={last ? "Finish onboarding" : "Next slide"}
                  className="h-12 w-12 rounded-full mr-3 p-0 items-center justify-center bg-white"
                >
                  <Icon as={last ? ChevronsRightIcon : ChevronRightIcon} className="w-5 h-5 text-black" />
                </Button>
              </View>
            </View>

            {/* Dev reset */}
            <Button
              action="secondary"
              variant="outline"
              onPress={resetOnboarding}
              className="self-center mt-2"
            >
              <ButtonText>Dev: Reset onboarding flag</ButtonText>
            </Button>
          </VStack>
        </Card>
      </View>
    </View>
      );
    })()
  );
}
