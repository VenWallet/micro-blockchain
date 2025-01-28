import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Injectable } from '@nestjs/common';
import { HttpCustomService } from 'src/shared/http/http.service';
import { AxiosRequestConfig } from 'axios';
import { KeyPair, utils, Account, keyStores, Near } from 'near-api-js';
import { functionCall } from 'near-api-js/lib/transaction';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { NearUtils } from './near.utils';
import { AccountService } from './account.service';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../../config/env';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import { ProtocolInterface } from '../procotol.inferface';
import { ftGetTokensMetadata, fetchAllPools, estimateSwap, instantSwap } from '@ref-finance/ref-sdk';
const BN = require('bn.js');
const nearSeed = require('near-seed-phrase');

@Injectable()
export class NearService implements ProtocolInterface {
  constructor(
    private readonly nearUtils: NearUtils,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async generateWallet() {
    try {
      // const { publicKey, secretKey } = nearSeed.generateSeedPhrase();
      const walletSeed = nearSeed.generateSeedPhrase();
      const keyPair = KeyPair.fromString(walletSeed.secretKey);
      const implicitAccountId = Buffer.from(keyPair.getPublicKey().data).toString('hex');

      // const wallet = {
      //   address: implicitAccountId,
      //   privateKey: secretKey,
      //   publicKey: publicKey,
      // };

      console.log('walletSeed', walletSeed);

      console.log('implicitAccountId', implicitAccountId);

      return walletSeed;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async fromMnemonic(mnemonic: string): Promise<{
    network: NetworksEnum;
    index: IndexEnum;
    address: string;
    privateKey: string;
  }> {
    try {
      const walletSeed = await nearSeed.parseSeedPhrase(mnemonic);
      const keyPair = KeyPair.fromString(walletSeed.secretKey);
      const implicitAccountId = Buffer.from(keyPair.getPublicKey().data).toString('hex');

      const credential = {
        network: NetworksEnum.NEAR,
        index: IndexEnum.NEAR,
        address: implicitAccountId,
        privateKey: walletSeed.secretKey as string,
      };

      return credential;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async isAddress(address: string): Promise<boolean> {
    try {
      const keyStore = new keyStores.InMemoryKeyStore();
      const near = new Near(this.nearUtils.configNear(keyStore));
      const account = new AccountService(near.connection, address);
      const is_address = await account
        .state()
        .then((response) => {
          return true;
        })
        .catch((error) => {
          return false;
        });
      return is_address;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      let balanceTotal = 0;

      const keyStore = new keyStores.InMemoryKeyStore();
      const near = new Near(this.nearUtils.configNear(keyStore));

      const account = new Account(near.connection, address);

      const balanceAccount = await account.state().catch((error) => {
        return {
          amount: 0,
          storage_usage: 0,
        };
      });

      const valueStorage = Math.pow(10, 19);
      const valueYocto = Math.pow(10, 24);
      const storage = (balanceAccount.storage_usage * valueStorage) / valueYocto;
      balanceTotal = Number(balanceAccount.amount) / valueYocto - storage;
      if (!balanceTotal || balanceTotal < 0) {
        balanceTotal = 0;
      }
      return balanceTotal;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalanceToken(address: string, contractId: string, decimals: number): Promise<number> {
    try {
      const keyStore = new keyStores.InMemoryKeyStore();
      const near = new Near(this.nearUtils.configNear(keyStore));

      const account = new AccountService(near.connection, address);

      const balance = await account.viewFunction({
        contractId: contractId,
        methodName: 'ft_balance_of',
        args: { account_id: address },
      });

      if (!balance) return 0;

      return balance / Math.pow(10, decimals);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transfer(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<string> {
    try {
      const balance = await this.getBalance(fromAddress);

      console.log('amountInYocto1');

      if (balance < amount) throw new Error(`Error: You do not have enough funds to make the transfer`);

      const keyStore = new keyStores.InMemoryKeyStore();

      console.log('amountInYocto2', privateKey);

      const keyPair = KeyPair.fromString(privateKey as any);

      console.log('amountInYocto2.1', keyPair);

      console.log(this.configService.get('NEAR_ENV', { infer: true })!, fromAddress, keyPair);

      keyStore.setKey(this.configService.get('NEAR_ENV', { infer: true })!, fromAddress, keyPair);

      console.log('amountInYocto3');

      const near = new Near(this.nearUtils.configNear(keyStore));

      const account = new AccountService(near.connection, fromAddress);

      console.log('amountInYocto4');

      const amountInYocto = utils.format.parseNearAmount(String(amount));

      if (!amountInYocto) throw new Error(`Failed to send transfer.`);

      const response = await account.sendMoney(toAddress, new BN(amountInYocto));

      if (!response.transaction.hash) throw new Error(`Failed to send transfer.`);

      return response.transaction.hash as string;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transferToken(
    fromAddress: string,
    privateKey: string,
    toAddress: string,
    amount: number,
    contract: string,
    decimals: number,
  ): Promise<string> {
    try {
      const srcToken = {
        contract,
        decimals,
      };

      if (!srcToken) {
        throw new Error(`Invalid Token`);
      }

      const keyStore = new keyStores.InMemoryKeyStore();

      const keyPair = KeyPair.fromString(privateKey as utils.key_pair.KeyPairString);
      keyStore.setKey(this.configService.get('NEAR_ENV', { infer: true })!, fromAddress, keyPair);
      const near = new Near(this.nearUtils.configNear(keyStore));

      const account = new AccountService(near.connection, fromAddress);

      const activated = await this.nearUtils.activateAccount(account, fromAddress, toAddress, srcToken.contract, near);

      if (!activated) throw new Error(`Error: To activated account`);

      let value = Math.pow(10, srcToken.decimals);
      let srcAmount = Math.round(amount * value);

      const trx = await this.nearUtils.createTransactionFn(
        srcToken.contract,
        [
          await functionCall(
            'ft_transfer',
            {
              receiver_id: toAddress,
              amount: srcAmount.toLocaleString('fullwide', { useGrouping: false }),
            },
            new BN('30000000000000'),
            new BN('1'),
          ),
        ],
        fromAddress,
        near,
      );

      const result = await account.signAndSendTrx(trx);

      if (!result.transaction.hash) throw new Error(`Failed to send transfer.`);

      return result.transaction.hash as string;
    } catch (error) {
      console.log('ERROR TRANSFER', error);
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransfer(): Promise<number> {
    try {
      return 0.001;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransferToken(): Promise<number> {
    try {
      return 0.001;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async previewSwap(
    fromToken: any,
    toToken: any,
    amount: number,
    address: string,
  ): Promise<{ dataSwap: any; priceRoute: any }> {
    try {
      const tokenIn = fromToken?.contract || 'wrap.near';
      const tokenOut = toToken?.contract || 'wrap.near';
      const tokensMetadata = await ftGetTokensMetadata([tokenIn, tokenOut]);
      const transactionsRef = await this.nearUtils.getTxSwapRef(
        tokensMetadata[tokenIn],
        tokensMetadata[tokenOut],
        amount,
        address,
      );
      const transactionsDcl = await this.nearUtils.getTxSwapDCL(
        tokensMetadata[tokenIn],
        tokensMetadata[tokenOut],
        amount,
      );
      const minAmountRef = await this.nearUtils.getMinAmountOut(transactionsRef, tokenOut);
      let minAmountDcl = await this.nearUtils.getMinAmountOut(transactionsDcl, tokenOut);
      console.log(minAmountRef, minAmountDcl);
      let txMain: any;
      let minAmountOut: any = 0;
      txMain = transactionsRef;
      minAmountOut = minAmountRef;
      if (!txMain || !minAmountOut) {
        new ExceptionHandler(`Failed to create tx.`);
      }
      const transaction = txMain.find(
        (element: { functionCalls: { methodName: string }[] }) =>
          element.functionCalls[0].methodName === 'ft_transfer_call',
      );
      if (!transaction) {
        new ExceptionHandler(`Failed to create tx.`);
      }
      const transfer: any = transaction.functionCalls[0].args;
      const amountIn = transfer.amount;
      let feeTransfer = '0.1';
      let porcentFee = 0.1;
      let secondNum;
      if (tokenOut === `wrap.${'near'}`) {
        secondNum = minAmountOut;
        minAmountOut = utils.format.parseNearAmount(String(minAmountOut));
      } else {
        secondNum = minAmountOut / Math.pow(10, Number(tokensMetadata[tokenOut].decimals));
      }
      const firstNum = Number(amountIn) / Math.pow(10, Number(tokensMetadata[tokenIn].decimals));
      const swapRate = String(secondNum / firstNum);
      const dataSwap = {
        exchange: 'Ref Finance',
        fromAmount: amountIn,
        fromDecimals: tokensMetadata[tokenIn].decimals,
        toAmount: String(minAmountOut),
        toDecimals: tokensMetadata[tokenOut].decimals,
        swapRate,
        contract: tokenIn,
        fee: String(porcentFee),
      };
      return {
        dataSwap,
        priceRoute: { tokenIn, tokenOut, amountIn: String(amountIn), minAmountOut: String(minAmountOut), txMain },
      };
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async swap(priceRoute: any, privateKey: string, address: string): Promise<any> {
    try {
      const transaction = priceRoute.txMain.find(
        (element: { functionCalls: { methodName: string }[] }) =>
          element.functionCalls[0].methodName === 'ft_transfer_call',
      );
      if (!transaction) throw new Error(`Failed to create tx.`);
      const tokensMetadata = await ftGetTokensMetadata([priceRoute.tokenIn, priceRoute.tokenOut]);
      const tokenIn = tokensMetadata[priceRoute.tokenIn];
      const tokenOut = tokensMetadata[priceRoute.tokenOut];
      const keyStore = new keyStores.InMemoryKeyStore();
      const keyPair = KeyPair.fromString(privateKey as utils.key_pair.KeyPairString);
      keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
      const near = new Near(this.nearUtils.configNear(keyStore));
      const account = new AccountService(near.connection, address);
      let nearTransactions: any[] = [];
      if (priceRoute.tokenIn.includes('wrap.')) {
        const trx = await this.nearUtils.createTransactionFn(
          priceRoute.tokenIn,
          [await functionCall('near_deposit', {}, new BN('300000000000000'), new BN(priceRoute.amountIn))],
          address,
          near,
        );
        nearTransactions.push(trx);
      }
      const trxs = await Promise.all(
        priceRoute.txMain.map(async (tx: any) => {
          return await this.nearUtils.createTransactionFn(
            tx.receiverId,
            tx.functionCalls.map((fc: any) => {
              return functionCall(
                fc.methodName,
                fc.args,
                fc.gas,
                new BN(String(utils.format.parseNearAmount(fc.amount))),
              );
            }),
            address,
            near,
          );
        }),
      );
      nearTransactions = nearTransactions.concat(trxs);
      if (priceRoute.tokenOut.includes('wrap.')) {
        const trx = await this.nearUtils.createTransactionFn(
          priceRoute.tokenOut,
          [
            await functionCall(
              'near_withdraw',
              { amount: priceRoute.minAmountOut },
              new BN('300000000000000'),
              new BN('1'),
            ),
          ],
          address,
          near,
        );
        nearTransactions.push(trx);
      }
      let resultSwap: any;
      for (let trx of nearTransactions) {
        const result = await account.signAndSendTrx(trx);
        if (trx.actions[0].functionCall.methodName === 'ft_transfer_call') {
          resultSwap = result;
        }
      }
      if (!resultSwap.transaction.hash) return false;
      const transactionHash = resultSwap.transaction.hash;
      const block = resultSwap.transaction_outcome.block_hash;
      if (!transactionHash) return false;
      const srcAmount = String(Number(priceRoute.amountIn) / Math.pow(10, tokenIn.decimals));
      const destAmount = String(Number(priceRoute.minAmountOut) / Math.pow(10, tokenOut.decimals));
      return {
        transactionHash,
        srcAmount,
        destAmount,
        block,
      };
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transferNft(
    fromAddress: string,
    privateKey: string,
    tokenId: string,
    contract: string,
    destination: string,
  ): Promise<string> {
    try {
      const keyStore = new keyStores.InMemoryKeyStore();
      const keyPair = KeyPair.fromString(privateKey as any);
      keyStore.setKey(this.configService.get('NEAR_ENV', { infer: true })!, fromAddress, keyPair);
      const near = new Near(this.nearUtils.configNear(keyStore));
      const account = new AccountService(near.connection, fromAddress);
      const trx = await this.nearUtils.createTransactionFn(
        contract,
        [
          await functionCall(
            'nft_transfer',
            {
              token_id: tokenId,
              receiver_id: destination,
            },
            new BN('300000000000000'),
            new BN('1'),
          ),
        ],
        fromAddress,
        near,
      );
      const result = await account.signAndSendTrx(trx);
      if (!result.transaction.hash) throw new Error(`Failed to send transfer.`);
      return result.transaction.hash as string;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
