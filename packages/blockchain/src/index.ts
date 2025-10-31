/**
 * Blockchain Package - Stub Implementation
 *
 * This package provides stub implementations for blockchain functionality
 * that will be fully implemented later with Web3 integration (viem, wagmi, EAS, etc.)
 */

export interface CardInstance {
  key: string;
  cardId: number;
  comboId: number;
  rarityId: number;
  contentHash: string;
  owner: string;
  path: "EAS" | "ERC1155";
  attUID?: string;
  tokenId1155?: string;
  txHash?: string;
}

export interface MintOptions {
  wallet: string;
  cardId: number;
  comboId: number;
  rarityId: number;
  contentHash: string;
  path: "EAS" | "ERC1155";
}

/**
 * Mint a card as either an EAS attestation or ERC-1155 NFT
 * @stub Returns mock data - actual blockchain integration to be implemented
 */
export async function mintCard(options: MintOptions): Promise<CardInstance> {
  // TODO: Implement actual blockchain minting
  // - For EAS: Create delegated attestation, submit via relayer
  // - For ERC-1155: Sign voucher with EIP-712, allow lazy minting

  console.warn("[STUB] mintCard called - not yet implemented on blockchain");

  return {
    key: `0x${Math.random().toString(16).slice(2)}`, // Mock key
    cardId: options.cardId,
    comboId: options.comboId,
    rarityId: options.rarityId,
    contentHash: options.contentHash,
    owner: options.wallet,
    path: options.path,
    attUID: options.path === "EAS" ? `0x${Math.random().toString(16).slice(2)}` : undefined,
    tokenId1155: options.path === "ERC1155" ? `0x${Math.random().toString(16).slice(2)}` : undefined,
    txHash: `0x${Math.random().toString(16).slice(2)}`,
  };
}

/**
 * Transfer a card from one wallet to another
 * @stub Returns mock data - actual blockchain integration to be implemented
 */
export async function transferCard(
  instanceKey: string,
  fromWallet: string,
  toWallet: string,
): Promise<CardInstance> {
  // TODO: Implement actual blockchain transfers
  // - For EAS: Revoke old attestation, create new one with refUID
  // - For ERC-1155: Standard safeTransferFrom

  console.warn("[STUB] transferCard called - not yet implemented on blockchain");

  return {
    key: instanceKey,
    cardId: 1,
    comboId: 1,
    rarityId: 1,
    contentHash: "0x...",
    owner: toWallet,
    path: "EAS",
    txHash: `0x${Math.random().toString(16).slice(2)}`,
  };
}

/**
 * Get all cards owned by a wallet
 * @stub Returns empty array - actual blockchain integration to be implemented
 */
export async function getWalletCards(wallet: string): Promise<CardInstance[]> {
  // TODO: Implement actual blockchain queries
  // - Query EAS attestations where recipient = wallet
  // - Query ERC-1155 balances for this wallet

  console.warn("[STUB] getWalletCards called - not yet implemented on blockchain");

  return [];
}

/**
 * Promote an EAS attestation to an ERC-1155 NFT
 * @stub Returns mock data - actual blockchain integration to be implemented
 */
export async function promoteToNFT(attUID: string): Promise<CardInstance> {
  // TODO: Implement promotion flow
  // - Revoke EAS attestation
  // - Mint ERC-1155 with same (cardId, comboId, rarityId, contentHash)

  console.warn("[STUB] promoteToNFT called - not yet implemented on blockchain");

  return {
    key: `0x${Math.random().toString(16).slice(2)}`,
    cardId: 1,
    comboId: 1,
    rarityId: 1,
    contentHash: "0x...",
    owner: "0x...",
    path: "ERC1155",
    tokenId1155: `0x${Math.random().toString(16).slice(2)}`,
    txHash: `0x${Math.random().toString(16).slice(2)}`,
  };
}
