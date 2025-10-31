import type { RouterOutputs } from "@zeeze/api";
import { Suspense } from "react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { CreateCardSchema } from "@zeeze/db/schema";
import { cn } from "@zeeze/ui";
import { Button } from "@zeeze/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@zeeze/ui/field";
import { Input } from "@zeeze/ui/input";
import { toast } from "@zeeze/ui/toast";

import { AuthShowcase } from "~/component/auth-showcase";
import { useTRPC } from "~/lib/trpc";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    const { trpc, queryClient } = context;
    void queryClient.prefetchQuery(trpc.card.list.queryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="container h-screen py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Create <span className="text-primary">T3</span> Turbo
        </h1>
        <AuthShowcase />

        <CreateCardForm />
        <div className="w-full max-w-2xl overflow-y-scroll">
          <Suspense
            fallback={
              <div className="flex w-full flex-col gap-4">
                <CardItemSkeleton />
                <CardItemSkeleton />
                <CardItemSkeleton />
              </div>
            }
          >
            <CardList />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function CreateCardForm() {
  const trpc = useTRPC();

  const queryClient = useQueryClient();
  const createCard = useMutation(
    trpc.card.create.mutationOptions({
      onSuccess: async () => {
        form.reset();
        await queryClient.invalidateQueries(trpc.card.pathFilter());
      },
      onError: (err: any) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to create cards"
            : "Failed to create card",
        );
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      class: "Creature",
      colors: [],
      manaCost: "1",
      rulesText: "",
      edition: "Season 1",
      createdBy: "demo-user",
    },
    onSubmit: (data: any) => createCard.mutate(data.value),
  });

  return (
    <form
      className="w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="name"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>Card Name</FieldLabel>
                </FieldContent>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    // Auto-generate slug
                    form.setFieldValue(
                      "slug",
                      e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    );
                  }}
                  aria-invalid={isInvalid}
                  placeholder="Card Name"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="rulesText"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldContent>
                  <FieldLabel htmlFor={field.name}>Rules Text</FieldLabel>
                </FieldContent>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="What does this card do?"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>
      <Button type="submit">Create Card</Button>
    </form>
  );
}

function CardList() {
  const trpc = useTRPC();
  const { data: cards } = useSuspenseQuery(trpc.card.list.queryOptions());

  if (cards.length === 0) {
    return (
      <div className="relative flex w-full flex-col gap-4">
        <CardItemSkeleton pulse={false} />
        <CardItemSkeleton pulse={false} />
        <CardItemSkeleton pulse={false} />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
          <p className="text-2xl font-bold text-white">No cards yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {cards.map((c: any) => {
        return <CardItem key={c.id} card={c} />;
      })}
    </div>
  );
}

function CardItem(props: { card: RouterOutputs["card"]["list"][number] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteCard = useMutation(
    trpc.card.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.card.pathFilter());
      },
      onError: (err: any) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to delete a card"
            : "Failed to delete card",
        );
      },
    }),
  );

  return (
    <div className="bg-muted flex flex-row rounded-lg p-4">
      <div className="grow">
        <h2 className="text-primary text-2xl font-bold">
          {props.card.name} <span className="text-sm">({props.card.class})</span>
        </h2>
        <p className="mt-2 text-sm">{props.card.rulesText}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mana Cost: {props.card.manaCost}
        </p>
      </div>
      <div>
        <Button
          variant="ghost"
          className="text-primary cursor-pointer text-sm font-bold uppercase hover:bg-transparent hover:text-white"
          onClick={() => deleteCard.mutate({ id: props.card.id })}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function CardItemSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <div className="bg-muted flex flex-row rounded-lg p-4">
      <div className="grow">
        <h2
          className={cn(
            "bg-primary w-1/4 rounded-sm text-2xl font-bold",
            pulse && "animate-pulse",
          )}
        >
          &nbsp;
        </h2>
        <p
          className={cn(
            "mt-2 w-1/3 rounded-sm bg-current text-sm",
            pulse && "animate-pulse",
          )}
        >
          &nbsp;
        </p>
      </div>
    </div>
  );
}
