import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { LegendList } from "@legendapp/list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

function CardItem(props: {
  card: RouterOutputs["card"]["list"][number];
  onDelete: () => void;
}) {
  return (
    <View className="bg-muted flex flex-row rounded-lg p-4">
      <View className="grow">
        <Link
          asChild
          href={{
            pathname: "/post/[id]",
            params: { id: props.card.id.toString() },
          }}
        >
          <Pressable className="">
            <Text className="text-primary text-xl font-semibold">
              {props.card.name}
            </Text>
            <Text className="text-foreground mt-2">{props.card.rulesText}</Text>
          </Pressable>
        </Link>
      </View>
      <Pressable onPress={props.onDelete}>
        <Text className="text-primary font-bold uppercase">Delete</Text>
      </Pressable>
    </View>
  );
}

function CreateCard() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [rulesText, setRulesText] = useState("");

  const { mutate, error } = useMutation(
    trpc.card.create.mutationOptions({
      async onSuccess() {
        setName("");
        setRulesText("");
        await queryClient.invalidateQueries(trpc.card.list.queryFilter());
      },
    }),
  );

  return (
    <View className="mt-4 flex gap-2">
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 text-lg leading-tight"
        value={name}
        onChangeText={setName}
        placeholder="Card Name"
      />
      {error?.data?.zodError?.fieldErrors.name && (
        <Text className="text-destructive mb-2">
          {error.data.zodError.fieldErrors.name}
        </Text>
      )}
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 text-lg leading-tight"
        value={rulesText}
        onChangeText={setRulesText}
        placeholder="Rules Text"
      />
      {error?.data?.zodError?.fieldErrors.rulesText && (
        <Text className="text-destructive mb-2">
          {error.data.zodError.fieldErrors.rulesText}
        </Text>
      )}
      <Pressable
        className="bg-primary flex items-center rounded-sm p-2"
        onPress={() => {
          mutate({
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-"),
            rulesText,
            class: "Creature",
            colors: ["W"],
            manaCost: "2W",
            edition: "Core",
            createdBy: "mobile-user",
          });
        }}
      >
        <Text className="text-foreground">Create Card</Text>
      </Pressable>
      {error?.data?.code === "UNAUTHORIZED" && (
        <Text className="text-destructive mt-2">
          You need to be logged in to create a card
        </Text>
      )}
    </View>
  );
}

function MobileAuth() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <Text className="text-foreground pb-2 text-center text-xl font-semibold">
        {session?.user.name ? `Hello, ${session.user.name}` : "Not logged in"}
      </Text>
      <Pressable
        onPress={() =>
          session
            ? authClient.signOut()
            : authClient.signIn.social({
                provider: "discord",
                callbackURL: "/",
              })
        }
        className="bg-primary flex items-center rounded-sm p-2"
      >
        <Text>{session ? "Sign Out" : "Sign In With Discord"}</Text>
      </Pressable>
    </>
  );
}

export default function Index() {
  const queryClient = useQueryClient();

  const cardQuery = useQuery(trpc.card.list.queryOptions());

  const deleteCardMutation = useMutation(
    trpc.card.delete.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries(trpc.card.list.queryFilter()),
    }),
  );

  return (
    <SafeAreaView className="bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "Home Page" }} />
      <View className="bg-background h-full w-full p-4">
        <Text className="text-foreground pb-2 text-center text-5xl font-bold">
          Zeeze <Text className="text-primary">Cards</Text>
        </Text>

        <MobileAuth />

        <View className="py-2">
          <Text className="text-primary font-semibold italic">
            Press on a card
          </Text>
        </View>

        <LegendList
          data={cardQuery.data ?? []}
          estimatedItemSize={20}
          keyExtractor={(item) => item.id.toString()}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={(c) => (
            <CardItem
              card={c.item}
              onDelete={() => deleteCardMutation.mutate({ id: c.item.id })}
            />
          )}
        />

        <CreateCard />
      </View>
    </SafeAreaView>
  );
}
