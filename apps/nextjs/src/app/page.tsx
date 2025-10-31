import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@zeeze/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zeeze/ui/card";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";
import {
  CreatePostForm,
  PostCardSkeleton,
  PostList,
} from "./_components/posts";

export default function HomePage() {
  prefetch(trpc.post.all.queryOptions());

  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              Zeeze <span className="text-primary">Cards</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Create and collect AI-powered MTG-style cards
            </p>
          </div>

          <AuthShowcase />

          {/* Quick Actions */}
          <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle>Create a Card</CardTitle>
                <CardDescription>
                  Use AI to generate unique cards with custom art and abilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/create-card">
                  <Button className="w-full">Start Creating</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle>Browse Collection</CardTitle>
                <CardDescription>
                  Explore all created cards and build your deck
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-lg">
              <CardHeader>
                <CardTitle>Play Game</CardTitle>
                <CardDescription>
                  Join or create game rooms for 2-4 player matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Demo Posts Section */}
          <div className="w-full max-w-2xl">
            <h2 className="mb-4 text-2xl font-bold">Recent Activity</h2>
            <CreatePostForm />
            <div className="mt-4 max-h-[400px] overflow-y-auto">
              <Suspense
                fallback={
                  <div className="flex w-full flex-col gap-4">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                  </div>
                }
              >
                <PostList />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
