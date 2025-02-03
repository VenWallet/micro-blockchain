import { IndexEnum } from 'src/modules/network/enums/index.enum';

export const DepositAddressEnum = {
  [IndexEnum.NEAR]: '0d5b06f3ac3ce792f972c700972f3a1ed1d11d6776e030b9d3909f66d7e553c4',
  [IndexEnum.ARBITRUM]: '0xd09ce287e54a0d0232d69a6ebb9a48d764a7ac20',
  [IndexEnum.BITCOIN]: '1794pRhLKHFtPSBGTNEYUaiv2PLcLrHiDV',
  [IndexEnum.BSC]: '0xd09ce287e54a0d0232d69a6ebb9a48d764a7ac20',
  [IndexEnum.ETHEREUM]: '0xd09ce287e54a0d0232d69a6ebb9a48d764a7ac20',
  [IndexEnum.SOLANA]: '9zxKCdpcChfH7WdkF2TQyo1DCuV2mZKGH7jajDRoFkqC',
  [IndexEnum.TRON]: 'TMktvg6hCLpS2aLe9FqAQ92rakL2R6Wdfx',
} as const;

type DepositAddressEnum = typeof DepositAddressEnum;
