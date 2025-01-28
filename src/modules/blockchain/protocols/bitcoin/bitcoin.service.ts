import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { KeyPair, utils, Account, keyStores, Near } from 'near-api-js';
import { functionCall } from 'near-api-js/lib/transaction';
import { ExceptionHandler } from 'src/helpers/handlers/exception.handler';
import { NetworksEnum } from 'src/modules/network/enums/networks.enum';
import { networks, payments, script } from 'bitcoinjs-lib';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/config/env';
import { IndexEnum } from 'src/modules/network/enums/index.enum';
import * as abi from '../abi.json';
import { ProtocolInterface } from '../procotol.inferface';
// const WAValidator = require('wallet-address-validator');
import * as WAValidator from 'wallet-address-validator';
import * as bip39 from 'bip39';
import * as ecc from 'tiny-secp256k1';
import ecfacory, { TinySecp256k1Interface, ECPairAPI, ECPairFactory } from 'ecpair';
import BIP32Factory from 'bip32';
import { HttpService } from '@nestjs/axios';
import { HttpCustomService } from 'src/shared/http/http.service';
import { AxiosRequestConfig } from 'axios';
// import { WAValidator } from 'wallet-address-validator';
import { BitcoinUtils } from './bitcoin.utils';
const bip32 = BIP32Factory(ecc);
const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
const ECPair: ECPairAPI = ECPairFactory(tinysecp);

@Injectable()
export class BitcoinService implements ProtocolInterface {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly bitcoinUtils: BitcoinUtils,
    private readonly httpService: HttpCustomService,
  ) {}

  async fromMnemonic(mnemonic: string): Promise<{
    network: NetworksEnum;
    index: IndexEnum;
    address: string;
    privateKey: string;
  }> {
    try {
      const network = networks.bitcoin; //use networks.testnet networks.bitcoin for testnet
      const path = `m/49'/0'/0'/0`;

      const seed = bip39.mnemonicToSeedSync(mnemonic);

      const root = bip32.fromSeed(seed, network);

      const account = root.derivePath(path);

      const node = account.derive(0).derive(0);

      const address = payments.p2pkh({
        pubkey: node.publicKey,
        network: network,
      }).address;

      if (!address) throw new BadRequestException(`Error: Failed to generate address`);

      const credential = {
        network: NetworksEnum.BITCOIN,
        index: IndexEnum.BITCOIN,
        address: address,
        privateKey: node.toWIF(),
      };

      return credential;
    } catch (error) {
      console.log('ERROR FROM MNEMONIC', error);
      throw new ExceptionHandler(error);
    }
  }

  async isAddress(address: string): Promise<boolean> {
    try {
      return await WAValidator.validate(address, 'BTC');
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      try {
        return await this.bitcoinUtils.getBalanceMain(address);
      } catch (error) {
        return await this.bitcoinUtils.getBalanceCypher(address);
      }
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalanceToken(address: string, contractId: string, decimals: number): Promise<number> {
    try {
      throw new Error('Method not implemented.');
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transfer(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<string> {
    try {
      const network = networks.bitcoin;
      const keys = ECPair.fromWIF(privateKey, network);

      const value_satoshi = 100000000;
      const amountSatoshi = amount * value_satoshi;

      const data = {
        inputs: [
          {
            addresses: [fromAddress],
          },
        ],
        outputs: [
          {
            addresses: [toAddress],
            value: parseInt(String(amountSatoshi)),
          },
        ],
      };

      // First request to create a new transaction
      const tmptxResponse = await this.httpService.request<any>({
        method: 'POST',
        url: `https://api.blockcypher.com/v1/btc/${this.configService.get('BLOCKCYPHER', { infer: true })!}/txs/new`,
        body: data,
      });

      const tmptx = tmptxResponse.data;

      tmptx.pubkeys = [];
      tmptx.signatures = tmptx.tosign.map((tosign: any, n: any) => {
        tmptx.pubkeys.push(keys.publicKey.toString());
        return script.signature
          .encode(keys.sign(Buffer.from(tosign, 'hex')), 0x01)
          .toString()
          .slice(0, -2);
      });

      // Second request to send the signed transaction
      const finaltxResponse = await this.httpService.request<any>({
        method: 'POST',
        url: `https://api.blockcypher.com/v1/btc/${this.configService.get('BLOCKCYPHER', { infer: true })!}/txs/send`,
        body: tmptx,
      });

      const txHash = finaltxResponse.data.tx.hash;
      console.log('hash', txHash);

      if (!txHash) throw new Error(`Failed to send BTC, no transaction hash received.`);

      return txHash;
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
      throw new Error('Method not implemented.');
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransfer(
    amount: number = 0.0003,
    address: string = '15krWJTAriVnmXgZZzPENV3ohh2AwdQDgH',
  ): Promise<number> {
    try {
      const fee = await this.bitcoinUtils.newTxFee(amount, address);

      return fee;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransferToken(): Promise<number> {
    try {
      throw new Error('Method not implemented.');
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
}
