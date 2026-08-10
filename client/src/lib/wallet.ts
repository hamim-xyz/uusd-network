import { Wallet } from "ethers";

export function generateWallet() {
  const wallet = Wallet.createRandom();
  return {
    mnemonic: wallet.mnemonic?.phrase || "",
    privateKey: wallet.privateKey,
    address: wallet.address,
  };
}
