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

@Injectable()
export class BinanceService implements ProtocolInterface {
  private readonly web3: Web3;
  private provider: ethers.JsonRpcProvider;

  constructor(private readonly configService: ConfigService<EnvironmentVariables>) {
    const BSC_NETWORK = this.configService.get('BSC_NETWORK', { infer: true })!;
    const INFURA_PROJECT_ID = this.configService.get('INFURA_PROJECT_ID', { infer: true })!;

    // const nodeUrl =
    //   BSC_NETWORK === 'mainnet'
    //     ? 'https://bsc-dataseed.binance.org/'
    //     : 'https://data-seed-prebsc-1-s1.binance.org:8545/';

    const nodeUrl = `https://bsc-${BSC_NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`;

    this.web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));

    this.provider = new ethers.JsonRpcProvider(nodeUrl);
  }

  async fromMnemonic(mnemonic: string): Promise<{
    network: NetworksEnum;
    index: IndexEnum;
    address: string;
    privateKey: string;
  }> {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);

      const credential = {
        network: NetworksEnum.BSC,
        index: IndexEnum.BSC,
        address: wallet.address,
        privateKey: wallet.privateKey,
      };

      return credential;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async isAddress(address: string): Promise<boolean> {
    try {
      return isAddress(address);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      let balance = await this.web3.eth.getBalance(address);

      let balanceTotal = 0;

      if (balance) {
        let value = Math.pow(10, 18);
        balanceTotal = Number(balance) / value;
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
      // console.log('abi', abi);
      let contract = new this.web3.eth.Contract(abi, contractId);

      const balance: bigint = await contract.methods.balanceOf(address).call();

      console.log(balance);

      let balanceTotal = 0;

      if (balance) {
        const value = BigInt(Math.pow(10, decimals));

        balanceTotal = Number(balance / value);

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
        throw new Error(`Error: You do not have enough funds to make the transfer`);
      }

      const gasPrice = await this.web3.eth.getGasPrice();
      const gasLimit = 21000;
      const nonce = await this.web3.eth.getTransactionCount(fromAddress);

      const rawTransaction = {
        from: fromAddress,
        to: toAddress,
        value: this.web3.utils.toHex(
          this.web3.utils.toWei(amount.toLocaleString('fullwide', { useGrouping: false }), 'ether'),
        ),
        gasPrice: this.web3.utils.toHex(gasPrice),
        gasLimit: this.web3.utils.toHex(gasLimit),
        nonce: nonce,
      };

      const signedTransaction = await this.web3.eth.accounts.signTransaction(rawTransaction, privateKey);

      if (!signedTransaction.rawTransaction) throw new Error(`Error: Failed to sign transaction`);

      const transactionHash = await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

      if (!transactionHash.transactionHash) throw new Error(`Error: Failed to send transaction`);

      return transactionHash.transactionHash as string;
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

      const balance = await this.getBalanceToken(fromAddress, srcToken.contract, srcToken.decimals);
      if (balance < amount) {
        throw new Error(`Error: You do not have enough funds to make the transfer`);
      }

      const feeData = await this.provider.getFeeData();

      const gasPrice = feeData.gasPrice;

      const minABI = abi;

      const wallet = new ethers.Wallet(privateKey);

      const signer = await this.provider.getSigner();

      console.log(srcToken.contract);

      const contractItem = new ethers.Contract(srcToken.contract, minABI, signer);

      let value = Math.pow(10, srcToken.decimals);
      let srcAmount = amount * value;

      const gasLimit = (contractItem.estimateGas as any).transfer(
        toAddress,
        srcAmount.toLocaleString('fullwide', { useGrouping: false }),
      );

      const tx = await contractItem.transfer(toAddress, srcAmount.toLocaleString('fullwide', { useGrouping: false }), {
        gasLimit: gasLimit,
        gasPrice: gasPrice,
      });

      console.log('PASOOO');

      if (!tx.hash) throw new Error(`Error tx hash.`);

      return tx.hash as string;
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
