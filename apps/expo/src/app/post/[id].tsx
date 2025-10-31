import { SafeAreaView, Text, View } from "react-native";
import { Stack, useGlobalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function Card() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { data } = useQuery(trpc.card.byId.queryOptions({ id: Number(id) }));

  if (!data) return null;

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: data.name }} />
      <View className="h-full w-full p-4">
        <Text className="text-primary py-2 text-3xl font-bold">
          {data.name}
        </Text>
        {data.manaCost && (
          <Text className="text-foreground py-2">Mana Cost: {data.manaCost}</Text>
        )}
        <Text className="text-foreground py-2">{data.rulesText}</Text>
        {data.lore && (
          <Text className="text-muted-foreground italic py-4">{data.lore}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
