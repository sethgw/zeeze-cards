import { authRouter } from "./router/auth";
import { cardRouter } from "./router/card";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  card: cardRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
