
# 🧙‍♂️ MTG-Style Card Game Plan (Base L2)
### Featuring PNG Art, Powers/Abilities, Lazy NFTs & Attestations

This document outlines the architecture and data model for an **MTG-like trading card game** built on **Base L2**, where users can mint cards either as **lazy-minted ERC-1155 NFTs** or **EAS attestations (ownership receipts)**. PNG art is the standard asset type.

---

## 1. Core Model

| Concept | Description |
|----------|--------------|
| **Card** | Immutable template: name, color, mana cost, class, abilities. |
| **Combo** | Variant of a card (foil, alt-art, signed, etc.). |
| **Rarity** | Defines supply weights and caps (Common → Mythic). |
| **Instance** | A player-owned version of a `(cardId, comboId, rarityId, contentHash)` triple — either an EAS attestation or ERC-1155 token. |

**Canonical keys:**
```solidity
key = keccak256(abi.encode(cardId, comboId, rarityId, contentHash))
tokenId1155 = keccak256(abi.encode(cardId, comboId, rarityId))
```
Notes:
- `key` uniquely identifies an issued item **including** its art hash (PNG integrity).
- `tokenId1155` groups instances by gameplay identity (ignores art hash) for marketplace compatibility.

---

## 2. PNG Art & Metadata

- Store PNGs on **S3, Cloudflare R2, or IPFS**.
- Compute `contentHash = keccak256(fileBytes)` for integrity (also store SHA-256 if you want client-side WebCrypto verification).
- Attach structured JSON for marketplace compatibility (ERC-1155 metadata).

**Example ERC-1155 metadata JSON (`{id}.json`):**
```json
{
  "name": "Blazing Drake — Mythic Foil (S3 Alt-Art)",
  "description": "Season 3 mythic foil print of Blazing Drake.",
  "image": "ipfs://CID/blazing_drake_foil.png",
  "attributes": [
    {"trait_type":"Card","value":"Blazing Drake"},
    {"trait_type":"Class","value":"Creature"},
    {"trait_type":"Color","value":"Red"},
    {"trait_type":"ManaCost","value":"3RR"},
    {"trait_type":"Power","value":"5"},
    {"trait_type":"Toughness","value":"4"},
    {"trait_type":"Ability","value":"Haste"},
    {"trait_type":"Ability","value":"Firebreathing"},
    {"trait_type":"Rarity","value":"Mythic"},
    {"trait_type":"Frame","value":"Foil"},
    {"trait_type":"Season","value":"3"},
    {"trait_type":"Art Variant","value":"Alt-Art"}
  ],
  "external_url": "https://yourgame.xyz/card/0xTOKENID"
}
```

---

## 3. Abilities & Rules Schema (for Prisma)

```prisma
model Card {
  id           Int       @id @default(autoincrement())
  slug         String    @unique
  name         String
  class        CardClass
  colors       Color[]
  manaCost     String          // e.g. "3RR" (parseable)
  rulesText    String          // human-readable oracle text
  power        Int?            // creature only
  toughness    Int?            // creature only
  edition      String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  abilities    CardAbility[]
  combos       Combo[]
}

enum CardClass { Creature Sorcery Instant Artifact Enchantment Land Planeswalker }
enum Color { W U B R G C }

model Ability {
  id        Int       @id @default(autoincrement())
  code      String    @unique         // e.g. "HASTE", "FLYING", "ETB_BURN"
  name      String
  kind      AbilityKind
  params    Json?                   // e.g. {"damage":3,"target":"any"}
  rulesText String                  // templated text for UI
  cards     CardAbility[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

enum AbilityKind { Keyword Activated Triggered Static }

model CardAbility {
  cardId     Int
  abilityId  Int
  priority   Int
  @@id([cardId, abilityId])
  card       Card    @relation(fields: [cardId], references: [id])
  ability    Ability @relation(fields: [abilityId], references: [id])
}

model Rarity {
  id           Int     @id @default(autoincrement())
  name         String  @unique    // Common/Uncommon/Rare/Mythic/Promo
  weight       Int               // RNG weight for packs
  maxPerCombo  Int?              // cap within a combo (null = unbounded)
}

model Combo {
  id         Int      @id @default(autoincrement())
  cardId     Int
  season     Int
  frame      String   // "Foil", "Non-Foil", "Borderless"
  artVariant String   // "Alt-Art A", "Signed"
  signature  String?
  createdAt  DateTime @default(now())
  card       Card     @relation(fields: [cardId], references: [id])
  supplies   ComboSupply[]
}

model ComboSupply {
  id         Int     @id @default(autoincrement())
  comboId    Int
  rarityId   Int
  cap        Int?
  minted     Int     @default(0) // off-chain tally for vouchers/attestations
  combo      Combo   @relation(fields: [comboId], references: [id])
  rarity     Rarity  @relation(fields: [rarityId], references: [id])
}

model Instance {
  key           String   @id       // hex keccak256(cardId, comboId, rarityId, contentHash)
  cardId        Int
  comboId       Int
  rarityId      Int
  contentHash   String   // hex keccak256 of PNG
  owner         String   // wallet (lowercased)
  path          Path     // EAS or ERC1155
  attUID        String?  // EAS UID
  tokenId1155   String?  // ERC-1155 token id (hex)
  txHash        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Path { EAS ERC1155 }
```

**Notes**
- `Ability.params` expresses ETB triggers, activations, damage values, target rules, etc.
- `Instance` is your merged index across both minting paths.

---

## 4. EAS Attestations (Ownership Receipts)

**Schema fields:**
```
recipient: address
cardId: uint256
comboId: uint256
rarityId: uint256
contentHash: bytes32
uri: string
version: uint64
refUID: bytes32
```

**Resolver rules (recommended):**
- Reject duplicate `(cardId, comboId, rarityId, contentHash)` unless handling a **transfer** with proper provenance.
- Allow “transfer” only if `refUID` references the latest owner’s attestation and that attestation is revoked (or revoked in the same bundle).
- Optional allowlist: only your trusted relayer can create “mint” attestations.

**EAS Flow:**
1. Frontend uploads PNG → receives `uri`; computes `contentHash`.
2. User signs **delegated-attestation**; backend submits (use Paymaster for gasless UX).
3. Persist `Instance` (`path=EAS`, `attUID`, `key`).

**Transfer:** revoke old attestation → issue new attestation to buyer with `refUID` to prior UID (preserves provenance).

---

## 5. Lazy-Minted ERC-1155 (Market-Ready NFTs)

**Voucher struct:**
```solidity
struct MintVoucher {
  address to;
  uint256 tokenId;        // keccak256(cardId, comboId, rarityId)
  uint256 amount;         // usually 1
  string  uri;            // metadata JSON
  bytes32 contentHash;    // PNG hash
  bytes32 key;            // keccak256(cardId, comboId, rarityId, contentHash)
  uint256 nonce;
  uint256 deadline;
}
```

**Core contract logic (sketch):**
```solidity
mapping(bytes32 => bool) public issued; // guards duplicate mints by key

function mintWithSignature(MintVoucher calldata v, bytes calldata sig) external {
    require(block.timestamp <= v.deadline, "expired");
    require(!issued[v.key], "already-issued");
    _verifySig(v, sig); // EIP-712 signer == Minter
    issued[v.key] = true;
    _mint(v.to, v.tokenId, v.amount, "");
    // Optionally: emit Minted(to, tokenId, amount, v.key);
}
```

**EIP-712 domain & types (server):**
```ts
const domain = {
  name: "YourGame1155Minter",
  version: "1",
  chainId: 8453,         // Base mainnet
  verifyingContract: "0xYour1155"
};

const types = {
  MintVoucher: [
    { name: "to", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "uri", type: "string" },
    { name: "contentHash", type: "bytes32" },
    { name: "key", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};
```

**Lazy Mint Flow:**
1. Server validates supply/caps and `issued[key] == false`.
2. Server signs voucher → client calls `mintWithSignature` (gas-sponsored if desired).
3. Persist `Instance` (`path=ERC1155`, `tokenId1155`, `key`, `txHash`).

**Promote Attestation → NFT:** revoke latest EAS attestation; mint ERC-1155 with same `(cardId, comboId, rarityId, contentHash)`.

---

## 6. API Endpoints

| Method & Path | Purpose |
|-----------|----------|
| `POST /api/cards` | Admin create cards & abilities |
| `POST /api/combos` | Admin define prints/variants |
| `POST /api/upload` | Upload PNG → `{uri, contentHash}` |
| `POST /api/attest` | Create delegated EAS attestation |
| `POST /api/voucher` | Return signed ERC-1155 voucher |
| `POST /api/promote` | Convert attestation → NFT |
| `GET  /api/inventory/:wallet` | Merge EAS + NFT ownership view |

**Guards & policies**
- Enforce rarity caps in the server (and optionally in on-chain resolver).
- Maintain `ComboSupply.minted` counters on success.
- Rate-limit per wallet/IP; optional allowlist for early seasons.

---

## 7. Rarity & Pack RNG

Weights example:
```json
[
  {"name":"Common","id":0,"weight":10000},
  {"name":"Uncommon","id":1,"weight":3300},
  {"name":"Rare","id":2,"weight":1000},
  {"name":"Mythic","id":3,"weight":250},
  {"name":"Promo","id":4,"weight":50}
]
```

**Selection pseudocode (deterministic):**
```ts
function pickRarity(seed: string): number {
  const weights = [10000, 3300, 1000, 250, 50];
  const total = weights.reduce((a,b)=>a+b,0);
  // treat keccak256(seed) as a big integer mod total:
  const r = BigInt("0x" + keccak256(seed)) % BigInt(total);
  let acc = 0n;
  for (let i=0;i<weights.length;i++){
    acc += BigInt(weights[i]);
    if (r < acc) return i;
  }
  return 0;
}
```
- Start with **commit–reveal** (cheap and transparent).
- Upgrade to **VRF** later without changing distribution logic.

---

## 8. Frontend UX

- **Wallets:** Coinbase Smart Wallet + passkeys; enable gas sponsorship for frictionless first mints/attests.
- **Two actions:**  
  - 🪶 **Get Receipt (EAS)** — lightweight proof of ownership.  
  - 💎 **Claim NFT (ERC-1155)** — market-ready asset.
- **Verification:** Link to EAS Scan (for attestations) or Basescan/marketplaces (for NFTs).
- **In-game trading:** For EAS, implement revoke→reissue with `refUID`; for ERC-1155, standard transfers or marketplace listings (e.g., Magic Eden on Base).

---

## 9. Invariants & Testing

- **Uniqueness:** `issued[key]` must be unique across **both** minting paths.
- **Provenance:** Transfers must preserve history (`refUID` chains; ERC-1155 Transfer events).
- **Caps:** Enforce rarity/season caps server-side; consider on-chain guards for critical seasons.
- **PNG pipeline:** Validate MIME, maximum dimensions/size; recompute `contentHash` server-side; compare to client-provided hash.

---

## 10. Rollout Plan

1. **Base Sepolia**: deploy EAS schema & 1155 test contract; wire Paymaster.
2. Implement `/upload` → `/attest` → `/voucher` happy paths.
3. Add **Promote to NFT** (attestation → 1155).
4. Add basic in-game trades: EAS (revoke→reissue) and 1155 (transfer/list).
5. **Mainnet** migration after rarity & caps battle-testing. Add monitoring for issuance and transfers.

---

## Appendix A — Suggested Table Indexes

- `Card.slug` unique
- `Combo(cardId, season)` index
- `ComboSupply(comboId, rarityId)` unique
- `Instance(owner)` index; `Instance(tokenId1155)` index; `Instance(attUID)` index

---

## Appendix B — Minimal Server Route Contracts (Type Hints)

```ts
// POST /api/upload
// body: multipart/form-data PNG
// returns: { uri: string, contentHash: `0x${string}` }

// POST /api/attest
// body: { wallet, cardId, comboId, rarityId, uri, contentHash }
// returns: { uid, txHash, key }

// POST /api/voucher
// body: { wallet, cardId, comboId, rarityId, uri, contentHash }
// returns: { voucher, key }

// POST /api/promote
// body: { wallet, attUID }
// action: revoke attestation, mint ERC-1155 with same tuple
// returns: { tokenId1155, txHash, key }
```

---

## Appendix C — Client Hashing (PNG)

```ts
async function hashPNG(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // Use keccak256 from viem or ethers:
  return keccak256(new Uint8Array(buf)); // "0x..."
}
```

---

## Appendix D — Security & Abuse Prevention

- Duplicate/stolen art: enforce `contentHash` uniqueness, optional creator attestations.
- Rate-limit crafting/mints; captcha or wallet age checks.
- Use nonces + deadlines on vouchers; revoke compromised minter keys immediately.
- Logs/metrics: monitor issuance per `(card, combo, rarity)` and top holders.

---

**End of document.**
