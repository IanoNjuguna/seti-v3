import type { AssetCode } from '@seti/shared';

export interface SwapResult {
  transactionHash: string;
  inputAmount: string;
  outputAmount: string;
}

export interface SettlementResult {
  transactionHash: string;
  confirmed: boolean;
}

export class OnChainAdapter {
  async swap(
    _inputAsset: AssetCode,
    _outputAsset: AssetCode,
    _amount: string,
    _chain: string,
  ): Promise<SwapResult> {
    // Stub: simulate a swap
    await new Promise((r) => setTimeout(r, 500));
    return {
      transactionHash: `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 6)}`,
      inputAmount: _amount,
      outputAmount: _amount,
    };
  }

  async sendSettlement(
    _asset: AssetCode,
    _amount: string,
    _chain: string,
  ): Promise<SettlementResult> {
    // Stub: simulate settlement transfer
    await new Promise((r) => setTimeout(r, 500));
    return {
      transactionHash: `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 6)}`,
      confirmed: true,
    };
  }
}
