import { Account, Contract, keyStores, utils } from 'near-api-js';
import { Action, createTransaction, functionCall } from 'near-api-js/lib/transaction';
import { KeyPair, PublicKey } from 'near-api-js/lib/utils';
import { ConnectedWalletAccount, Near, WalletConnection } from 'near-api-js';
const BN = require('bn.js');
import { Injectable } from '@nestjs/common';
import { AccountService } from './account.service';
import { EnvironmentVariables } from 'src/config/env';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const configService = new ConfigService<EnvironmentVariables>();

const NETWORK = configService.get('NEAR_ENV', { infer: true }) || 'testnet';

@Injectable()
export class NearUtils {
  public configNear(keyStores: any) {
    switch (NETWORK) {
      case 'mainnet':
        return {
          networkId: 'mainnet',
          nodeUrl: 'https://rpc.mainnet.near.org',
          keyStore: keyStores,
          walletUrl: 'https://wallet.near.org',
          helperUrl: 'https://helper.mainnet.near.org',
          explorerUrl: 'https://explorer.mainnet.near.org',
        };
      case 'testnet':
        return {
          networkId: 'testnet',
          keyStore: keyStores,
          nodeUrl: 'https://rpc.testnet.near.org',
          walletUrl: 'https://wallet.testnet.near.org',
          helperUrl: 'https://helper.testnet.near.org',
          explorerUrl: 'https://explorer.testnet.near.org',
        };
      default:
        throw new Error(`Unconfigured environment '${NETWORK}'`);
    }
  }

  public async createTransactionFn(receiverId: string, actions: Action[], userAddress: string, near: Near) {
    try {
      const walletConnection = new WalletConnection(near, 'micro-near');
      const wallet = new ConnectedWalletAccount(walletConnection, near.connection, userAddress);

      if (!wallet || !near) {
        throw new Error(`No active wallet or NEAR connection.`);
      }

      const localKey = await near?.connection.signer.getPublicKey(userAddress, near.connection.networkId);

      const accessKey = await wallet.accessKeyForTransaction(receiverId, actions, localKey);

      if (!accessKey) {
        throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
      }

      const block = await near?.connection.provider.block({
        finality: 'final',
      });

      if (!block) {
        throw new Error(`Cannot find block for transaction sent to ${receiverId}`);
      }

      const blockHash = utils.serialize.base_decode(block?.header?.hash);

      const publicKey = PublicKey.from(accessKey.public_key);
      const nonce = ++accessKey.access_key.nonce;

      return createTransaction(userAddress, publicKey, receiverId, nonce, actions, blockHash);
    } catch (error) {
      console.log(error);
      throw new Error('Error in createTransactionFn');
    }
  }

  public async activateAccount(
    account: AccountService,
    fromAddress: string,
    toAddress: string,
    srcToken: string,
    near: Near,
  ) {
    try {
      if (!toAddress) return false;
      const contract: any = new Contract(
        account, // the account object that is connecting
        srcToken,
        {
          viewMethods: ['storage_balance_of'], // view methods do not change state but usually return a value
          changeMethods: [], // change methods modify state
        } as any,
      );

      const addressActivate = await contract.storage_balance_of({
        account_id: toAddress,
      });

      if (addressActivate && Number(addressActivate.available) > 0) return true;

      const trx = await this.createTransactionFn(
        srcToken,
        [
          functionCall(
            'storage_deposit',
            {
              registration_only: false,
              account_id: toAddress,
            },
            new BN('300000000000000'),
            new BN('10000000000000000000000'),
          ),
        ],
        fromAddress,
        near,
      );

      const result = await account.signAndSendTrx(trx);

      if (!result.transaction.hash) return false;
      return true;
    } catch (error) {
      console.log('ACTIVATE ERR', error);
      return false;
    }
  }

  // public async getTxSwapRef(tokenMetadataA: any, tokenMetadataB: any, amount: number, address: string) {
  //   const { ratedPools, unRatedPools, simplePools } = await fetchAllPools();

  //   const stablePools: Pool[] = unRatedPools.concat(ratedPools);

  //   const stablePoolsDetail: StablePool[] = await getStablePools(stablePools);

  //   const options: SwapOptions = {
  //     enableSmartRouting: true,
  //     stablePools,
  //     stablePoolsDetail,
  //   };

  //   const swapAlls = await estimateSwap({
  //     tokenIn: tokenMetadataA,
  //     tokenOut: tokenMetadataB,
  //     amountIn: String(amount),
  //     simplePools: simplePools,
  //     options,
  //   });

  //   const transactionsRef = await instantSwap({
  //     tokenIn: tokenMetadataA,
  //     tokenOut: tokenMetadataB,
  //     amountIn: String(amount),
  //     swapTodos: swapAlls,
  //     slippageTolerance: 0.01,
  //     AccountId: address,
  //   });

  //   return transactionsRef;
  // }

  // public async getTxSwapDCL(tokenMetadataA: any, tokenMetadataB: any, amount: number) {
  //   const nearUsd = await this.getNearPrice();

  //   const fee = 2000;

  //   const pool_ids = [getDCLPoolId(tokenMetadataA.id, tokenMetadataB.id, fee)];

  //   const transactionsDcl = await DCLSwap({
  //     swapInfo: {
  //       amountA: String(amount),
  //       tokenA: tokenMetadataA,
  //       tokenB: tokenMetadataB,
  //     },
  //     Swap: {
  //       pool_ids,
  //       min_output_amount: String(Math.round(amount * nearUsd * 0.99 * Math.pow(10, tokenMetadataB.decimals))),
  //     },
  //     AccountId: tokenMetadataA.id,
  //   });

  //   return transactionsDcl;
  // }

  async getNearPrice() {
    try {
      const nearPrice: any = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=NEAR&vs_currencies=USD',
      );

      if (!nearPrice.data.near.usd) throw new Error('Error near usd');
      return nearPrice.data.near.usd;
    } catch (error) {
      const nearPrice = await axios.get('https://nearblocks.io/api/near-price');
      if (!nearPrice.data.usd) throw new Error('Error near usd');
      return nearPrice.data.usd;
    }
  }

  getMinAmountOut(trxSwap: any, tokenOut: string) {
    const transaction = trxSwap.find(
      (element: {
        functionCalls: {
          methodName: string;
        }[];
      }) => element.functionCalls[0].methodName === 'ft_transfer_call',
    );

    if (!transaction) return false;

    const argsMsg = JSON.parse(transaction.functionCalls[0].args.msg);

    console.log(argsMsg);

    if (Object.keys(argsMsg).includes('actions')) {
      let minAmountOut = 0;
      for (const action of argsMsg.actions) {
        if (action.token_out === tokenOut) {
          if (action.token_out === `wrap.${'near'}`) {
            minAmountOut += Number(utils.format.formatNearAmount(action.min_amount_out));
          } else {
            console.log(Number(action.min_amount_out));
            minAmountOut += Number(action.min_amount_out);
          }
        }
      }
      return minAmountOut;
    } else if (Object.keys(argsMsg).includes('Swap')) {
      if (tokenOut === `wrap.${'near'}`) {
        return Number(utils.format.formatNearAmount(argsMsg.Swap.min_output_amount));
      }
      return Number(argsMsg.Swap.min_output_amount);
    } else {
      return 0;
    }
  }
}

// public async getNearConfig() {
//   const keyStore = new keyStores.InMemoryKeyStore();

//   const keyPair = KeyPair.fromString(process.env.APOLO_CONTRACT_PRIVATE_KEY! || undefined);
//   keyStore.setKey(process.env.NEAR_ENV!, process.env.APOLO_CONTRACT_ADDRESS!, keyPair);

//   const near = new Near(this.configNear(keyStore));

//   const account = new AccountService(near.connection, process.env.APOLO_CONTRACT_ADDRESS!);

//   return { near, account };
//
