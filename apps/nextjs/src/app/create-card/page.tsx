"use client";

import { useState } from "react";
import { Button } from "@zeeze/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zeeze/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@zeeze/ui/tabs";
import { Textarea } from "@zeeze/ui/textarea";
import { Input } from "@zeeze/ui/input";
import { Label } from "@zeeze/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@zeeze/ui/select";
import { Badge } from "@zeeze/ui/badge";
import { toast } from "@zeeze/ui/toast";

import { useTRPC } from "~/trpc/react";
import { MTGCard } from "../_components/mtg-card";
import { useMutation } from "@tanstack/react-query";

interface CardData {
  // Step 1: Concept
  initialPrompt: string;
  cardClass?: "Creature" | "Sorcery" | "Instant" | "Artifact" | "Enchantment" | "Land" | "Planeswalker";
  colors: string[];

  // Step 2: Generated Lore
  name: string;
  lore: string;
  rulesText: string;
  manaCost: string;
  power?: number;
  toughness?: number;
  suggestedAbilities: string[];

  // Step 3: Image
  imagePrompt: string;
  imageUrl?: string;
  revisedPrompt?: string;

  // Metadata
  edition: string;
  slug: string;
};

export default function CreateCardPage() {
  const trpc = useTRPC();

  const [step, setStep] = useState<"concept" | "lore" | "image" | "finalize">("concept");
  const [cardData, setCardData] = useState<Partial<CardData>>({
    colors: [],
    edition: "Season 1",
  });

  const [isGeneratingLore, setIsGeneratingLore] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const generateLoreMutation = useMutation(trpc.card.generateLore.mutationOptions());
  const generateImageMutation = useMutation(trpc.card.generateImage.mutationOptions());
  const createCardMutation = useMutation(trpc.card.create.mutationOptions());

  const handleGenerateLore = async () => {
    if (!cardData.initialPrompt || cardData.initialPrompt.length < 10) {
      toast.error("Please provide a card concept (at least 10 characters)");
      return;
    }

    setIsGeneratingLore(true);
    try {
      const result = await generateLoreMutation.mutateAsync({
        prompt: cardData.initialPrompt,
        cardClass: cardData.cardClass,
        colors: cardData.colors as ("W" | "U" | "B" | "R" | "G" | "C")[],
      });

      setCardData({
        ...cardData,
        name: result.name,
        lore: result.lore,
        rulesText: result.rulesText,
        manaCost: result.manaCost,
        power: result.power,
        toughness: result.toughness,
        cardClass: result.class as CardData["cardClass"],
        suggestedAbilities: result.suggestedAbilities,
        slug: result.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      });

      toast.success("Card lore generated!");
      setStep("lore");
    } catch (error) {
      toast.error("Failed to generate lore");
      console.error(error);
    } finally {
      setIsGeneratingLore(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!cardData.imagePrompt || cardData.imagePrompt.length < 10) {
      toast.error("Please provide an image prompt");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const result = await generateImageMutation.mutateAsync({
        prompt: cardData.imagePrompt,
        cardName: cardData.name,
        lore: cardData.lore,
      });

      setCardData({
        ...cardData,
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
      });

      toast.success("Card art generated!");
      setStep("finalize");
    } catch (error) {
      toast.error("Failed to generate image");
      console.error(error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSaveCard = async () => {
    if (!cardData.name || !cardData.rulesText || !cardData.manaCost) {
      toast.error("Please complete all required fields");
      return;
    }

    try {
      await createCardMutation.mutateAsync({
        name: cardData.name,
        slug: cardData.slug!,
        class: cardData.cardClass!,
        colors: cardData.colors,
        manaCost: cardData.manaCost,
        rulesText: cardData.rulesText,
        power: cardData.power,
        toughness: cardData.toughness,
        edition: cardData.edition!,
        lore: cardData.lore,
        imageUrl: cardData.imageUrl,
        imagePrompt: cardData.imagePrompt,
        createdBy: "user-id", // TODO: Get from auth
      });

      toast.success("Card created successfully!");
      // TODO: Navigate to card view
    } catch (error) {
      toast.error("Failed to create card");
      console.error(error);
    }
  };

  const toggleColor = (color: string) => {
    const colors = cardData.colors || [];
    if (colors.includes(color)) {
      setCardData({ ...cardData, colors: colors.filter((c) => c !== color) });
    } else {
      setCardData({ ...cardData, colors: [...colors, color] });
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

      <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="concept">1. Concept</TabsTrigger>
          <TabsTrigger value="lore" disabled={!cardData.name}>
            2. Lore
          </TabsTrigger>
          <TabsTrigger value="image" disabled={!cardData.lore}>
            3. Image
          </TabsTrigger>
          <TabsTrigger value="finalize" disabled={!cardData.imageUrl}>
            4. Finalize
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Left: Form */}
          <div>
            <TabsContent value="concept" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Card Concept</CardTitle>
                  <CardDescription>
                    Describe your card idea and AI will generate the lore and mechanics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Card Concept *</Label>
                    <Textarea
                      id="prompt"
                      placeholder="e.g., A fierce dragon that breathes fire and guards ancient treasure..."
                      value={cardData.initialPrompt || ""}
                      onChange={(e) =>
                        setCardData({ ...cardData, initialPrompt: e.target.value })
                      }
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Card Type (Optional)</Label>
                    <Select
                      value={cardData.cardClass}
                      onValueChange={(value) =>
                        setCardData({
                          ...cardData,
                          cardClass: value as CardData["cardClass"],
                        })
                      }
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
                    <div className="flex gap-2">
                      {[
                        { code: "W", name: "White", class: "bg-amber-100 hover:bg-amber-200" },
                        { code: "U", name: "Blue", class: "bg-blue-100 hover:bg-blue-200" },
                        { code: "B", name: "Black", class: "bg-gray-800 text-white hover:bg-gray-900" },
                        { code: "R", name: "Red", class: "bg-red-100 hover:bg-red-200" },
                        { code: "G", name: "Green", class: "bg-green-100 hover:bg-green-200" },
                        { code: "C", name: "Colorless", class: "bg-gray-100 hover:bg-gray-200" },
                      ].map((color) => (
                        <Button
                          key={color.code}
                          variant={cardData.colors?.includes(color.code) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleColor(color.code)}
                          className={color.class}
                        >
                          {color.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateLore}
                    disabled={isGeneratingLore}
                    className="w-full"
                  >
                    {isGeneratingLore ? "Generating..." : "Generate Card"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lore" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Card Details</CardTitle>
                  <CardDescription>
                    Refine the AI-generated card or proceed to image generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Card Name *</Label>
                    <Input
                      id="name"
                      value={cardData.name || ""}
                      onChange={(e) =>
                        setCardData({
                          ...cardData,
                          name: e.target.value,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manaCost">Mana Cost *</Label>
                    <Input
                      id="manaCost"
                      placeholder="e.g., 3RR"
                      value={cardData.manaCost || ""}
                      onChange={(e) =>
                        setCardData({ ...cardData, manaCost: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rulesText">Rules Text *</Label>
                    <Textarea
                      id="rulesText"
                      value={cardData.rulesText || ""}
                      onChange={(e) =>
                        setCardData({ ...cardData, rulesText: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lore">Flavor Text</Label>
                    <Textarea
                      id="lore"
                      value={cardData.lore || ""}
                      onChange={(e) =>
                        setCardData({ ...cardData, lore: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  {cardData.cardClass === "Creature" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="power">Power</Label>
                        <Input
                          id="power"
                          type="number"
                          value={cardData.power || ""}
                          onChange={(e) =>
                            setCardData({
                              ...cardData,
                              power: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="toughness">Toughness</Label>
                        <Input
                          id="toughness"
                          type="number"
                          value={cardData.toughness || ""}
                          onChange={(e) =>
                            setCardData({
                              ...cardData,
                              toughness: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => setStep("image")}
                    className="w-full"
                  >
                    Continue to Image Generation
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="image" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Card Art</CardTitle>
                  <CardDescription>
                    Create unique artwork for your card using DALL-E 3
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="imagePrompt">Image Prompt *</Label>
                    <Textarea
                      id="imagePrompt"
                      placeholder="Describe the visual style and content..."
                      value={cardData.imagePrompt || ""}
                      onChange={(e) =>
                        setCardData({ ...cardData, imagePrompt: e.target.value })
                      }
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Be specific about style, lighting, and composition
                    </p>
                  </div>

                  {cardData.revisedPrompt && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-medium">AI Revised Prompt:</p>
                      <p className="text-xs text-muted-foreground">
                        {cardData.revisedPrompt}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    className="w-full"
                  >
                    {isGeneratingImage ? "Generating..." : "Generate Image"}
                  </Button>

                  {cardData.imageUrl && (
                    <Button
                      onClick={() => setStep("finalize")}
                      variant="outline"
                      className="w-full"
                    >
                      Continue to Finalize
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="finalize" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Finalize & Save</CardTitle>
                  <CardDescription>
                    Review your card and save it to your collection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Card Summary</Label>
                    <div className="space-y-1 rounded-md bg-muted p-3">
                      <p><strong>Name:</strong> {cardData.name}</p>
                      <p><strong>Type:</strong> {cardData.cardClass}</p>
                      <p><strong>Cost:</strong> {cardData.manaCost}</p>
                      <p><strong>Edition:</strong> {cardData.edition}</p>
                    </div>
                  </div>

                  {cardData.suggestedAbilities && cardData.suggestedAbilities.length > 0 && (
                    <div className="space-y-2">
                      <Label>Suggested Abilities</Label>
                      <div className="flex flex-wrap gap-2">
                        {cardData.suggestedAbilities.map((ability) => (
                          <Badge key={ability} variant="secondary">
                            {ability}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSaveCard}
                    disabled={createCardMutation.isPending}
                    className="w-full"
                  >
                    {createCardMutation.isPending ? "Saving..." : "Save Card"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Right: Preview */}
          <div className="sticky top-10">
            <div className="flex flex-col items-center">
              <Label className="mb-4 text-lg font-semibold">Card Preview</Label>
              <MTGCard
                name={cardData.name || "Card Name"}
                manaCost={cardData.manaCost}
                imageUrl={cardData.imageUrl}
                class={cardData.cardClass}
                colors={cardData.colors}
                rulesText={cardData.rulesText}
                power={cardData.power}
                toughness={cardData.toughness}
                lore={cardData.lore}
              />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
