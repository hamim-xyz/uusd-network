/**
 * BNB Smart Chain helpers — native BNB only for now.
 */
import { ethers } from 'ethers';
import { decryptPrivateKey } from './walletCrypto.js';

const DEFAULT_RPC = 'https://bsc-dataseed.binance.org/';

export function getProvider(): ethers.JsonRpcProvider {
  const url = process.env.BSC_RPC_URL || DEFAULT_RPC;
  return new ethers.JsonRpcProvider(url);
}

export function explorerTxUrl(txHash: string): string {
  return `https://bscscan.com/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://bscscan.com/address/${address}`;
}

/** On-chain native BNB balance (as number in BNB) */
export async function getBnbBalance(address: string): Promise<string> {
  const provider = getProvider();
  const wei = await provider.getBalance(address);
  return ethers.formatEther(wei);
}

/** Estimate gas fee in BNB for a simple native transfer */
export async function estimateBnbTransferFee(
  from: string,
  to: string,
  amountBnb: string
): Promise<{ gasLimit: string; gasPriceGwei: string; feeBnb: string }> {
  const provider = getProvider();
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('3', 'gwei');
  let gasLimit = 21000n;
  try {
    const est = await provider.estimateGas({
      from,
      to,
      value: ethers.parseEther(amountBnb || '0'),
    });
    gasLimit = est;
  } catch {
    gasLimit = 21000n;
  }
  const feeWei = gasPrice * gasLimit;
  return {
    gasLimit: gasLimit.toString(),
    gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
    feeBnb: ethers.formatEther(feeWei),
  };
}

/** Send native BNB from encrypted key */
export async function sendBnb(params: {
  encryptedPrivateKey: string;
  to: string;
  amountBnb: string;
}): Promise<{ txHash: string; feeBnb: string }> {
  const provider = getProvider();
  const pk = decryptPrivateKey(params.encryptedPrivateKey);
  const wallet = new ethers.Wallet(pk, provider);

  if (!ethers.isAddress(params.to)) {
    throw new Error('Invalid destination address');
  }

  const value = ethers.parseEther(params.amountBnb);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('3', 'gwei');
  const gasLimit = 21000n;
  const feeWei = gasPrice * gasLimit;

  const balance = await provider.getBalance(wallet.address);
  if (balance < value + feeWei) {
    throw new Error(
      `Insufficient BNB for amount + gas. Have ${ethers.formatEther(balance)} BNB`
    );
  }

  const tx = await wallet.sendTransaction({
    to: params.to,
    value,
    gasLimit,
    gasPrice,
  });
  await tx.wait(1);

  return {
    txHash: tx.hash,
    feeBnb: ethers.formatEther(feeWei),
  };
}
