"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@zeeze/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zeeze/ui/card";
import { Label } from "@zeeze/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@zeeze/ui/select";
import { Textarea } from "@zeeze/ui/textarea";
import { toast } from "@zeeze/ui/toast";

import { useTRPC } from "~/trpc/react";
import { MTGCard } from "../_components/mtg-card";

interface GeneratedCard {
  name: string;
  lore: string;
  rulesText: string;
  manaCost: string;
  power?: number;
  toughness?: number;
  cardClass:
    | "Creature"
    | "Sorcery"
    | "Instant"
    | "Artifact"
    | "Enchantment"
    | "Land"
    | "Planeswalker";
  imageUrl: string;
  slug: string;
  colors: string[];
}

type CardClass =
  | "Creature"
  | "Sorcery"
  | "Instant"
  | "Artifact"
  | "Enchantment"
  | "Land"
  | "Planeswalker";

export default function CreateCardPage() {
  const trpc = useTRPC();

  const [prompt, setPrompt] = useState("");
  const [cardType, setCardType] = useState<CardClass | undefined>(undefined);
  const [colors, setColors] = useState<string[]>([]);
  const [generatedCard, setGeneratedCard] = useState<GeneratedCard | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

  const generateLoreMutation = useMutation(
    trpc.card.generateLore.mutationOptions({}),
  );
  const generateImageMutation = useMutation(
    trpc.card.generateImage.mutationOptions({}),
  );
  const createCardMutation = useMutation(trpc.card.create.mutationOptions({}));

  const handleCreateCard = async () => {
    if (!prompt || prompt.length < 10) {
      toast.error("Please provide a card concept (at least 10 characters)");
      return;
    }

    if (!cardType) {
      toast.error("Please select a card type");
      return;
    }

    setIsGenerating(true);
    try {
      // Step 1: Generate card lore and mechanics
      const loreResult = await generateLoreMutation.mutateAsync({
        prompt,
        cardClass: cardType,
        colors: colors as ("W" | "U" | "B" | "R" | "G" | "C")[],
      });

      // Step 2: Generate image based on the lore
      const imagePrompt = `${loreResult.lore} ${loreResult.rulesText}`;
      const imageResult = await generateImageMutation.mutateAsync({
        prompt: imagePrompt,
        cardName: loreResult.name,
        lore: loreResult.lore,
      });

      // Step 3: Prepare the generated card
      const card: GeneratedCard = {
        name: loreResult.name,
        lore: loreResult.lore,
        rulesText: loreResult.rulesText,
        manaCost: loreResult.manaCost,
        power: loreResult.power,
        toughness: loreResult.toughness,
        cardClass: loreResult.class as GeneratedCard["cardClass"],
        imageUrl: imageResult.imageUrl,
        slug: loreResult.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        colors: colors,
      };

      setGeneratedCard(card);

      // Step 4: Save the card to the database
      await createCardMutation.mutateAsync({
        name: card.name,
        slug: card.slug,
        class: card.cardClass,
        colors: card.colors,
        manaCost: card.manaCost,
        rulesText: card.rulesText,
        power: card.power,
        toughness: card.toughness,
        edition: "Season 1",
        lore: card.lore,
        imageUrl: card.imageUrl,
        imagePrompt: imagePrompt,
        createdBy: "user-id", // TODO: Get from auth
      });

      toast.success("Card created successfully!");
    } catch (error) {
      toast.error("Failed to create card");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!generatedCard) return;

    setIsRegeneratingImage(true);
    try {
      const imagePrompt = `${generatedCard.lore} ${generatedCard.rulesText}`;
      const imageResult = await generateImageMutation.mutateAsync({
        prompt: imagePrompt,
        cardName: generatedCard.name,
        lore: generatedCard.lore,
      });

      setGeneratedCard({
        ...generatedCard,
        imageUrl: imageResult.imageUrl,
      });

      toast.success("Card image regenerated!");
    } catch (error) {
      toast.error("Failed to regenerate image");
      console.error(error);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleStartOver = () => {
    setPrompt("");
    setCardType(undefined);
    setColors([]);
    setGeneratedCard(null);
  };

  const toggleColor = (color: string) => {
    if (colors.includes(color)) {
      setColors(colors.filter((c) => c !== color));
    } else {
      setColors([...colors, color]);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Create a New Card</h1>
        <p className="text-muted-foreground">
          Use AI to generate unique MTG-style cards
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Input Form or Actions */}
        <div>
          {!generatedCard ? (
            <Card>
              <CardHeader>
                <CardTitle>Card Concept</CardTitle>
                <CardDescription>
                  Describe your card idea and AI will generate everything
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe Your Card</Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g., A fierce dragon that breathes fire and guards ancient treasure..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Card Type (Optional)</Label>
                  <Select
                    value={cardType}
                    onValueChange={setCardType}
                    disabled={isGenerating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Let AI decide" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Creature">Creature</SelectItem>
                      <SelectItem value="Sorcery">Sorcery</SelectItem>
                      <SelectItem value="Instant">Instant</SelectItem>
                      <SelectItem value="Artifact">Artifact</SelectItem>
                      <SelectItem value="Enchantment">Enchantment</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                      <SelectItem value="Planeswalker">Planeswalker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Colors (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        code: "W",
                        name: "White",
                        class: "bg-amber-100 hover:bg-amber-200",
                      },
                      {
                        code: "U",
                        name: "Blue",
                        class: "bg-blue-100 hover:bg-blue-200",
                      },
                      {
                        code: "B",
                        name: "Black",
                        class: "bg-gray-800 text-white hover:bg-gray-900",
                      },
                      {
                        code: "R",
                        name: "Red",
                        class: "bg-red-100 hover:bg-red-200",
                      },
                      {
                        code: "G",
                        name: "Green",
                        class: "bg-green-100 hover:bg-green-200",
                      },
                      {
                        code: "C",
                        name: "Colorless",
                        class: "bg-gray-100 hover:bg-gray-200",
                      },
                    ].map((color) => (
                      <Button
                        key={color.code}
                        variant={
                          colors.includes(color.code) ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => toggleColor(color.code)}
                        className={color.class}
                        disabled={isGenerating}
                      >
                        {color.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCreateCard}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Card...
                    </>
                  ) : (
                    "Create Card"
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Card Created!</CardTitle>
                <CardDescription>
                  Your card has been generated and saved
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="bg-muted space-y-2 rounded-sm p-4">
                    <div>
                      <strong className="text-sm">Name:</strong>
                      <p className="text-lg">{generatedCard.name}</p>
                    </div>
                    <div>
                      <strong className="text-sm">Type:</strong>
                      <p>{generatedCard.cardClass}</p>
                    </div>
                    <div>
                      <strong className="text-sm">Mana Cost:</strong>
                      <p>{generatedCard.manaCost}</p>
                    </div>
                    {generatedCard.power !== undefined &&
                      generatedCard.toughness !== undefined && (
                        <div>
                          <strong className="text-sm">Power/Toughness:</strong>
                          <p>
                            {generatedCard.power}/{generatedCard.toughness}
                          </p>
                        </div>
                      )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage}
                    className="w-full"
                    variant="outline"
                  >
                    {isRegeneratingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Regenerating Image...
                      </>
                    ) : (
                      "Regenerate Image"
                    )}
                  </Button>

                  <Button
                    onClick={handleStartOver}
                    className="w-full"
                    variant="secondary"
                  >
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Card Preview */}
        <div className="sticky top-10">
          <div className="flex flex-col items-center">
            <Label className="mb-4 text-lg font-semibold">Card Preview</Label>
            {isGenerating ? (
              <div className="bg-muted flex h-96 w-full flex-col items-center justify-center rounded-sm">
                <Loader2 className="text-primary h-12 w-12 animate-spin" />
                <p className="text-muted-foreground mt-4">
                  Generating your card...
                </p>
              </div>
            ) : generatedCard ? (
              <MTGCard
                name={generatedCard.name}
                manaCost={generatedCard.manaCost}
                imageUrl={generatedCard.imageUrl}
                class={generatedCard.cardClass}
                colors={generatedCard.colors}
                rulesText={generatedCard.rulesText}
                power={generatedCard.power}
                toughness={generatedCard.toughness}
                lore={generatedCard.lore}
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex h-96 w-full items-center justify-center rounded-sm">
                Enter a card concept to begin
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
