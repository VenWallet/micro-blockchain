import { Account, Contract, keyStores, utils } from 'near-api-js';
import { Action, createTransaction, functionCall } from 'near-api-js/lib/transaction';
import { KeyPair, PublicKey } from 'near-api-js/lib/utils';
import { ConnectedWalletAccount, Near, WalletConnection } from 'near-api-js';
const BN = require('bn.js');
import * as dotenv from 'dotenv';
import { Injectable } from '@nestjs/common';
import { AccountService } from './account.service';
dotenv.config();

const NETWORK = process.env.NEAR_ENV || 'testnet';

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

  // public async getNearConfig() {
  //   const keyStore = new keyStores.InMemoryKeyStore();

  //   const keyPair = KeyPair.fromString(process.env.APOLO_CONTRACT_PRIVATE_KEY! || undefined);
  //   keyStore.setKey(process.env.NEAR_ENV!, process.env.APOLO_CONTRACT_ADDRESS!, keyPair);

  //   const near = new Near(this.configNear(keyStore));

  //   const account = new AccountService(near.connection, process.env.APOLO_CONTRACT_ADDRESS!);

  //   return { near, account };
  // }
}
