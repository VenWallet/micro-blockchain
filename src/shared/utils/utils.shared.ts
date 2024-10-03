const nearSEED = require('near-seed-phrase');

export class UtilsShared {
  static validateEmail = (email: string) => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  };

  static getIdNear = async (mnemonic: string) => {
    const walletSeed = await nearSEED.parseSeedPhrase(mnemonic);
    const split = String(walletSeed.publicKey).split(':');
    const id = String(split[1]);
    return id;
  };

  static getLinkTransaction = (blockchain: string, transactionHash: string) => {
    switch (blockchain) {
      case 'BTC':
        if (process.env.NETWORK === 'mainnet') {
          return `https://live.blockcypher.com/btc/tx/${transactionHash}`;
        } else {
          return `https://live.blockcypher.com/btc-testnet/tx/${transactionHash}`;
        }
      case 'NEAR':
        if (process.env.NETWORK === 'mainnet') {
          return `https://explorer.near.org/transactions/${transactionHash}`;
        } else {
          return `https://explorer.testnet.near.org/transactions/${transactionHash}`;
        }
      case 'ETH':
        if (process.env.NETWORK === 'mainnet') {
          return `https://etherscan.io/tx/${transactionHash}`;
        } else {
          return `https://${process.env.ETHERSCAN}.etherscan.io/tx/${transactionHash}`;
        }
      case 'TRX':
        if (process.env.NETWORK === 'mainnet') {
          return `https://tronscan.org/#/transaction/${transactionHash}`;
        } else {
          return `https://shasta.tronscan.org/#/transaction/${transactionHash}`;
        }
      case 'BNB':
        if (process.env.NETWORK === 'mainnet') {
          return `https://bscscan.com/tx/${transactionHash}`;
        } else {
          return `https://testnet.bscscan.com/tx/${transactionHash}`;
        }
      default:
        throw new Error(`Error blockchain '${blockchain}'`);
    }
  };
}
