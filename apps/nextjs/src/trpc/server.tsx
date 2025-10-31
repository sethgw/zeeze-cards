import type { QueryKey } from "@tanstack/react-query";
import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@zeeze/api";
import { cache } from "react";
import { headers } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { appRouter, createTRPCContext } from "@zeeze/api";

import { auth } from "~/auth/server";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  const ctx = await createTRPCContext({
    headers: heads,
    auth,
  });
  return ctx;
});

const getQueryClient = cache(createQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  router: appRouter,
  ctx: createContext,
  queryClient: getQueryClient,
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<AppRouter>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();
  const queryKey = queryOptions.queryKey as QueryKey;
  if (
    queryKey[1] &&
    typeof queryKey[1] === "object" &&
    "type" in queryKey[1] &&
    queryKey[1].type === "infinite"
  ) {
    void queryClient.prefetchInfiniteQuery(
      queryOptions as TRPCQueryOptions<AppRouter> & { queryKey: QueryKey },
    );
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}
