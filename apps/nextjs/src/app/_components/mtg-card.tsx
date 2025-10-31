"use client";

import { Badge } from "@zeeze/ui/badge";
import { Card, CardContent, CardHeader } from "@zeeze/ui/card";
import { cn } from "@zeeze/ui";

interface MTGCardProps {
  name: string;
  manaCost?: string;
  imageUrl?: string;
  class?: string;
  colors?: string[];
  rulesText?: string;
  power?: number;
  toughness?: number;
  lore?: string;
  className?: string;
}

const COLOR_NAMES: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

const COLOR_GRADIENTS: Record<string, string> = {
  W: "from-amber-50 to-amber-100",
  U: "from-blue-50 to-blue-100",
  B: "from-gray-800 to-gray-900",
  R: "from-red-50 to-red-100",
  G: "from-green-50 to-green-100",
  C: "from-gray-50 to-gray-100",
};

export function MTGCard({
  name,
  manaCost,
  imageUrl,
  class: cardClass,
  colors = [],
  rulesText,
  power,
  toughness,
  lore,
  className,
}: MTGCardProps) {
  // Determine card border color based on colors
  const borderColor =
    colors.length === 1
      ? colors[0]
      : colors.length > 1
        ? "multi"
        : "colorless";

  const gradientClass =
    colors.length === 1
      ? COLOR_GRADIENTS[colors[0]!]
      : "from-amber-100 to-orange-100";

  return (
    <Card
      className={cn(
        "relative w-[280px] overflow-hidden shadow-xl transition-transform hover:scale-105",
        className,
      )}
    >
      {/* Card Header with Name and Mana Cost */}
      <CardHeader
        className={cn(
          "bg-gradient-to-br p-3",
          gradientClass,
          colors.includes("B") && "text-white",
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold leading-tight">{name}</h3>
            {cardClass && (
              <p className="text-xs opacity-80">{cardClass}</p>
            )}
          </div>
          {manaCost && (
            <div className="ml-2 flex items-center gap-0.5">
              {parseManaSymbols(manaCost).map((symbol, i) => (
                <ManaSymbol key={i} symbol={symbol} />
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Card Image */}
        {imageUrl ? (
          <div className="relative h-40 w-full overflow-hidden bg-gray-200">
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gray-200 text-gray-400">
            <span className="text-sm">No image</span>
          </div>
        )}

        {/* Type Line with Colors */}
        {colors.length > 0 && (
          <div className="flex gap-1 border-b px-3 py-2">
            {colors.map((color) => (
              <Badge key={color} variant="secondary" className="text-xs">
                {COLOR_NAMES[color]}
              </Badge>
            ))}
          </div>
        )}

        {/* Rules Text */}
        {rulesText && (
          <div className="border-b px-3 py-3">
            <p className="text-sm leading-relaxed">{rulesText}</p>
          </div>
        )}

        {/* Lore/Flavor Text */}
        {lore && (
          <div className="border-b px-3 py-2">
            <p className="text-xs italic text-muted-foreground">{lore}</p>
          </div>
        )}

        {/* Power/Toughness (for creatures) */}
        {power !== undefined && toughness !== undefined && (
          <div className="flex items-center justify-end px-3 py-2">
            <div className="rounded-md bg-gradient-to-br from-amber-100 to-amber-200 px-3 py-1 font-bold">
              {power}/{toughness}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function parseManaSymbols(costString: string): string[] {
  const symbols: string[] = [];
  let i = 0;

  while (i < costString.length) {
    const char = costString[i];

    // Check for numbers (generic mana)
    if (char && /[0-9]/.test(char)) {
      let numStr = char;
      while (i + 1 < costString.length && /[0-9]/.test(costString[i + 1]!)) {
        i++;
        numStr += costString[i];
      }
      symbols.push(numStr);
    }
    // Check for color symbols
    else if (char && ["W", "U", "B", "R", "G", "C"].includes(char)) {
      symbols.push(char);
    }

    i++;
  }

  return symbols;
}

function ManaSymbol({ symbol }: { symbol: string }) {
  const isNumber = /[0-9]/.test(symbol);

  const colorClasses: Record<string, string> = {
    W: "bg-amber-100 border-amber-400 text-amber-900",
    U: "bg-blue-100 border-blue-400 text-blue-900",
    B: "bg-gray-900 border-gray-700 text-white",
    R: "bg-red-100 border-red-400 text-red-900",
    G: "bg-green-100 border-green-400 text-green-900",
    C: "bg-gray-100 border-gray-400 text-gray-900",
  };

  const colorClass = isNumber
    ? "bg-gray-200 border-gray-400 text-gray-700"
    : colorClasses[symbol] || "bg-gray-200 border-gray-400";

  return (
    <div
      className={cn(
        "flex size-6 items-center justify-center rounded-full border-2 text-xs font-bold shadow-sm",
        colorClass,
      )}
    >
      {symbol}
    </div>
  );
}
