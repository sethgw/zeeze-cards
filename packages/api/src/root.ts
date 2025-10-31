import { authRouter } from "./router/auth";
import { cardRouter } from "./router/card";
import { postRouter } from "./router/post";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  card: cardRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
