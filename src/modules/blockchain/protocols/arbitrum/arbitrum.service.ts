import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { KeyPair, Account, keyStores, Near } from 'near-api-js';
import { functionCall } from 'near-api-js/lib/transaction';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';
import { ethers, Wallet, parseUnits } from 'ethers';
import Web3 from 'web3';
import web3Utils from 'web3-utils';
import { Web3Validator, isAddress } from 'web3-validator';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/config/env';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import * as abi from '../abi.json';
import { ProtocolInterface } from '../procotol.inferface';
import axios from 'axios';

@Injectable()
export class ArbitrumService implements ProtocolInterface {
  private readonly web3: Web3;
  private provider: ethers.JsonRpcProvider;

  constructor(private readonly configService: ConfigService<EnvironmentVariables>) {
    const ARBITRUM_NETWORK = this.configService.get('BSC_NETWORK', { infer: true })!;
    const INFURA_PROJECT_ID = this.configService.get('INFURA_PROJECT_ID', { infer: true })!;

    // const nodeUrl =
    //   BSC_NETWORK === 'mainnet'
    //     ? 'https://bsc-dataseed.arbitrum.org/'
    //     : 'https://data-seed-prebsc-1-s1.arbitrum.org:8545/';

    const nodeUrl = `https://arbitrum-${ARBITRUM_NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`;

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
        network: NetworksEnum.ARBITRUM,
        index: IndexEnum.ARBITRUM,
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
      let contract = new this.web3.eth.Contract(abi, contractId);

      const balance: bigint = await contract.methods.balanceOf(address).call();

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

      const baseGasPrice = await this.web3.eth.getGasPrice();
      const gasLimit = 1000000;
      const nonce = await this.web3.eth.getTransactionCount(fromAddress);

      console.log("this.web3.utils.toWei(amount.toLocaleString('fullwide', { useGrouping: false }), 'ether')");
      console.log(this.web3.utils.toWei(amount.toLocaleString('fullwide', { useGrouping: false }), 'ether'));

      const rawTransaction = {
        from: fromAddress,
        to: toAddress,
        value: this.web3.utils.toHex(
          this.web3.utils.toWei(amount.toLocaleString('fullwide', { useGrouping: false }), 'ether'),
        ),
        gasPrice: this.web3.utils.toHex(baseGasPrice),
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
      const minABI = abi;
      // this.web3.eth.accounts.wallet.add(privateKey);
      // const contractItem = new this.web3.eth.Contract(minABI, srcToken.contract);
      // let value = Math.pow(10, srcToken.decimals);
      // let srcAmount = amount * value;
      // const data = contractItem.methods.transfer(toAddress, srcAmount).encodeABI();
      // const gas = await this.web3.eth.estimateGas({
      //   from: fromAddress,
      //   to: toAddress,
      //   value: this.web3.utils.toWei(amount.toString(), 'ether'),
      // });
      // // Obtener el precio del gas
      // const gasPrice = await this.web3.eth.getGasPrice();
      // const nonce = await this.web3.eth.getTransactionCount(fromAddress);
      // const rawTransaction = {
      //   from: fromAddress,
      //   to: srcToken.contract,
      //   value: this.web3.utils.toWei(srcAmount.toString(), 'ether'),
      //   gas: this.web3.utils.toHex(gas),
      //   gasPrice: this.web3.utils.toHex(gasPrice),
      //   nonce: nonce,
      //   data: data,
      // };
      // const signedTransaction = await this.web3.eth.accounts.signTransaction(rawTransaction, privateKey);
      // if (!signedTransaction.rawTransaction) throw new Error(`Error: Failed to sign transaction`);
      // const transactionHash = await this.web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
      // if (!transactionHash.transactionHash) throw new Error(`Error: Failed to send transaction`);
      // return transactionHash.transactionHash as string;
      const signer = await new ethers.Wallet(privateKey, this.provider);
      const contractItem: any = new ethers.Contract(srcToken.contract, minABI, signer);
      let value = Math.pow(10, srcToken.decimals);
      let srcAmount = amount * value;
      const data = contractItem.interface.encodeFunctionData('transfer', [
        toAddress,
        srcAmount.toLocaleString('fullwide', { useGrouping: false }),
      ]);
      const tx = await signer.sendTransaction({
        to: srcToken.contract,
        from: signer.address,
        value: parseUnits('0.000', 'ether'),
        data: data,
      });
      console.log('TX', tx);
      return tx.hash as string;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransfer(): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
      const feeData = await provider.getFeeData();

      // Gas price en wei
      const gasPrice = feeData.gasPrice!;

      // Gas limit típico para una transferencia
      const gasLimit = 130000;

      // Calcula el costo total en wei
      const feeInWei = BigInt(gasPrice) * BigInt(gasLimit);

      // Convierte el costo a ETH
      const feeInEth = ethers.formatEther(feeInWei);

      // Parseamos a número flotante para cálculos posteriores
      // const feeInEthFloat = parseFloat(feeInEth);

      // // Obtener la tasa de conversión de ETH a ARB
      // const response = await fetch(
      //   'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,arbitrum&vs_currencies=usd',
      // );
      // const prices = await response.json();

      // const ethToUsd = prices.ethereum.usd;
      // const arbToUsd = prices.arbitrum.usd;

      // Calcular ETH -> ARB
      // const ethToArbRate = ethToUsd / arbToUsd;
      // const feeInArb = feeInEthFloat * ethToArbRate;

      return Number(feeInEth);

      // return `Costo estimado:
      //   - ETH: ${feeInEth} ETH
      //   - ARB: ${feeInArb.toFixed(6)} ARB`;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransferToken(): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
      const feeData = await provider.getFeeData();

      // Gas price en wei
      const gasPrice = feeData.gasPrice!;

      // Gas limit típico para una transferencia
      const gasLimit = 400000;

      // Calcula el costo total en wei
      const feeInWei = BigInt(gasPrice) * BigInt(gasLimit);

      // Convierte el costo a ETH
      const feeInEth = ethers.formatEther(feeInWei);

      // Parseamos a número flotante para cálculos posteriores
      // const feeInEthFloat = parseFloat(feeInEth);

      // // Obtener la tasa de conversión de ETH a ARB
      // const response = await fetch(
      //   'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,arbitrum&vs_currencies=usd',
      // );
      // const prices = await response.json();

      // const ethToUsd = prices.ethereum.usd;
      // const arbToUsd = prices.arbitrum.usd;

      // Calcular ETH -> ARB
      // const ethToArbRate = ethToUsd / arbToUsd;
      // const feeInArb = feeInEthFloat * ethToArbRate;

      return Number(feeInEth);

      // return `Costo estimado:
      //   - ETH: ${feeInEth} ETH
      //   - ARB: ${feeInArb.toFixed(6)} ARB`;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  previewSwap(fromCoin: string, toCoin: string, amount: number, address: string | undefined): Promise<any> {
    throw new Error('Method not implemented.');
  }

  swap(priceRoute: any, privateKey: string, address: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async transferNft(
    fromAddress: string,
    privateKey: string,
    tokenId: string,
    contract: string,
    destination: string,
  ): Promise<string> {
    try {
      throw new Error('Method not implemented.');
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  getLinkTransaction(txId: string): string {
    try {
      throw new Error('Method not implemented.');
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }
}
