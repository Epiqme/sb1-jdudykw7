import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, glass } from "@/src/theme";
import { BookCTA } from "@/src/components/BookCTA";
import { GlassFill } from "@/src/components/GlassFill";
import { useApp } from "@/src/AppContext";
import { api } from "@/src/api";

export default function TabsLayout() {
  const { profile } = useApp();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profile) {
      setUnread(0);
      return;
    }
    let active = true;
    const poll = async () => {
      try {
        const convos = await api.dmConversations(profile.id);
        if (active) setUnread(convos.reduce((sum, c) => sum + (c.unread || 0), 0));
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, 8000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [profile?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopColor: glass.hairline,
            height: 64,
            paddingTop: spacing.sm,
          },
          tabBarBackground: () => <GlassFill overlay={glass.overlayStrong} />,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        }}
        screenListeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      >
        <Tabs.Screen
          name="sailings"
          options={{
            title: "Sailings",
            tabBarIcon: ({ color, size }) => <Ionicons name="boat-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="icebreaker"
          options={{
            title: "Icebreaker",
            tabBarIcon: ({ color, size }) => <Ionicons name="snow-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: "Chats",
            tabBarBadge: unread > 0 ? unread : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.brand, color: colors.onBrand, fontSize: 10 },
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="deals"
          options={{
            title: "Deals",
            tabBarIcon: ({ color, size }) => <Ionicons name="pricetags-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
      <BookCTA />
    </View>
  );
}
