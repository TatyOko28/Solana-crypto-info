import { PublicKey } from '@solana/web3.js';

export function validateTokenAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function validatePoolAddress(address: string): boolean {
  return validateTokenAddress(address); // Basic validation, enhance as needed
}