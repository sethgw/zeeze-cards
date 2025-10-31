import Link from "next/link";
import { Button } from "@zeeze/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zeeze/ui/card";

import { HydrateClient } from "~/trpc/server";
import { AuthShowcase } from "./_components/auth-showcase";

export default function HomePage() {
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
        </div>
      </main>
    </HydrateClient>
  );
}
