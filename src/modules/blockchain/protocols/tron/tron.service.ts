import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { KeyPair, utils, Account, keyStores, Near } from 'near-api-js';
import { functionCall } from 'near-api-js/lib/transaction';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';
import { ethers, Wallet } from 'ethers';
import Web3 from 'web3';
import web3Utils from 'web3-utils';
import { Web3Validator, isAddress } from 'web3-validator';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/config/env';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import * as abi from '../abi.json';
import { ProtocolInterface } from '../procotol.inferface';
import { TronWeb, utils as TronWebUtils, Trx, TransactionBuilder, Contract, Event, Plugin, providers } from 'tronweb';

@Injectable()
export class TronService implements ProtocolInterface {
  private readonly tronWeb: TronWeb;

  constructor(private readonly configService: ConfigService<EnvironmentVariables>) {
    const TRON_PRO_API_KEY = this.configService.get('TRON_PRO_API_KEY', { infer: true })!;

    // const FULL_NODE = process.env.FULL_NODE;
    // const SOLIDITY_NODE = process.env.SOLIDITY_NODE;
    // const EVENT_SERVER = process.env.EVENT_SERVER;

    this.tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': TRON_PRO_API_KEY },
    });
  }

  async fromMnemonic(mnemonic: string): Promise<{
    network: NetworksEnum;
    index: IndexEnum;
    address: string;
    privateKey: string;
  }> {
    try {
      const wallet = await this.tronWeb.fromMnemonic(mnemonic);

      const privateKey = wallet.privateKey.indexOf('0x') === 0 ? wallet.privateKey.slice(2) : wallet.privateKey;

      const credential = {
        network: NetworksEnum.TRON,
        index: IndexEnum.TRON,
        address: wallet.address,
        privateKey: privateKey,
      };

      return credential;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async isAddress(address: string): Promise<boolean> {
    try {
      return await this.tronWeb.isAddress(address);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      let balanceTotal = 0;

      const balance = await this.tronWeb.trx.getBalance(address);

      if (balance) {
        let value = Math.pow(10, 6);
        balanceTotal = balance / value;
        if (!balanceTotal) {
          balanceTotal = 0;
        }
        return balanceTotal;
      } else {
        return balanceTotal;
      }
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalanceToken(address: string, contractId: string, decimals: number): Promise<number> {
    try {
      this.tronWeb.setAddress(contractId);
      const contract = await this.tronWeb.contract().at(contractId);

      const balance = await contract.balanceOf(address).call();

      let balanceTotal = 0;

      if (balance) {
        let value = Math.pow(10, decimals);
        balanceTotal = balance / value;
        if (!balanceTotal) {
          balanceTotal = 0;
        }
        return balanceTotal;
      } else {
        return balanceTotal;
      }
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transfer(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<string> {
    try {
      const balance = await this.getBalance(fromAddress);

      if (balance < amount) {
        throw new BadRequestException(`Error: You do not have enough funds to make the transfer`);
      }

      this.tronWeb.setAddress(fromAddress);

      let value = Math.pow(10, 6);
      let srcAmount = parseInt(String(amount * value));

      const tx = await this.tronWeb.transactionBuilder
        .sendTrx(toAddress, srcAmount)
        .then(function (response: any) {
          return response;
        })
        .catch(function (error: any) {
          return false;
        });

      if (!tx) throw new BadRequestException(`Error to do build transaction`);

      const signedTxn = await this.tronWeb.trx
        .sign(tx, privateKey)
        .then(function (response: any) {
          return response;
        })
        .catch(function (error: any) {
          return false;
        });

      if (!signedTxn.signature) {
        throw new BadRequestException(`Error to sign transaction`);
      }

      const result: any = await this.tronWeb.trx.sendRawTransaction(signedTxn);

      if (!result.txid) throw new BadRequestException(`Failed to send raw tx.`);

      return result.txid as string;
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
      const balance = await this.getBalanceToken(fromAddress, contract, decimals);
      if (balance < amount) {
        throw new BadRequestException(`Error: You do not have enough funds to make the transfer`);
      }

      const TRON_PRO_API_KEY = this.configService.get('TRON_PRO_API_KEY', { infer: true })!;

      const tronWebPK = new TronWeb({
        fullHost: 'https://api.trongrid.io',
        headers: { 'TRON-PRO-API-KEY': TRON_PRO_API_KEY },
        privateKey: privateKey,
      });

      tronWebPK.setAddress(fromAddress);

      let value = Math.pow(10, decimals);
      let srcAmount = parseInt(String(amount * value));

      const contractItem = await tronWebPK.contract().at(contract);
      const transaction = await contractItem
        .transfer(toAddress, srcAmount)
        .send()
        .then((output: any) => {
          return output;
        });

      return transaction;
    } catch (error) {
      console.log('ERROR TRANSFER', error);
      throw new ExceptionHandler(error);
    }
  }

  // async getTransaction(transactionHash: string): Promise<any> {
  //   try {
  //     const transaction = await this.web3.eth.getTransaction(transactionHash);

  //     if (!transaction) {
  //       throw new Error(`Error: Transaction not found`);
  //     }

  //     return transaction;
  //   } catch (error) {
  //     throw new ExceptionHandler(error);
  //   }
  // }
}
