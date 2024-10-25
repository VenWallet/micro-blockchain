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
const BN = require('bn.js');
const nearSeed = require('near-seed-phrase');

@Injectable()
export class NearService implements ProtocolInterface {
  private readonly configService: ConfigService<EnvironmentVariables>;

  constructor(private readonly nearUtils: NearUtils) {}

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
          console.log(response);
          return true;
        })
        .catch((error) => {
          console.log(error);
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

      if (balance < amount) throw new Error(`Error: You do not have enough funds to make the transfer`);

      const keyStore = new keyStores.InMemoryKeyStore();

      const keyPair = KeyPair.fromString(privateKey as utils.key_pair.KeyPairString);

      keyStore.setKey(this.configService.get('NEAR_ENV', { infer: true })!, fromAddress, keyPair);

      const near = new Near(this.nearUtils.configNear(keyStore));

      const account = new AccountService(near.connection, fromAddress);

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
}
