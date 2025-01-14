import { IndexEnum } from 'src/modules/network/enums/index.enum';

export const DepositAddressEnum = {
  [IndexEnum.NEAR]: '433995b080cb4598a6c8b8f011f3879cf3c6221907e08965ff61458adf85b7e8',
  [IndexEnum.ARBITRUM]: '0x9a477735d45e61c1070af53e1ff6985fbd604c81',
  // [IndexEnum.BITCOIN]: 'ASD',
  [IndexEnum.BSC]: '0x9a477735d45e61c1070af53e1ff6985fbd604c81',
  // [IndexEnum.ETHEREUM]: '0x9a477735d45e61c1070af53e1ff6985fbd604c81',
  [IndexEnum.SOLANA]: '4dbc9vxP2BrEpqkMZ9kmTwumsqtM5Ck79qiowfD3xrDC',
  [IndexEnum.TRON]: 'TUwanjmrDeyme45peeQXbj9tcJUqqsDxh7',
} as const;

type DepositAddressEnum = typeof DepositAddressEnum;
