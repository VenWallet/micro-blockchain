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
import * as bip39 from 'bip39';
import bs58 from 'bs58';
import { HttpCustomService } from 'src/shared/http/http.service';
import { derivePath } from 'ed25519-hd-key';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync, getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';

@Injectable()
export class SolanaService implements ProtocolInterface {
  private readonly connection: Connection;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly httpService: HttpCustomService,
  ) {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
  }

  async fromMnemonic(mnemonic: string): Promise<{
    network: NetworksEnum;
    index: IndexEnum;
    address: string;
    privateKey: string;
  }> {
    try {
      const seed = await bip39.mnemonicToSeed(mnemonic);

      const derivedSeed = derivePath(`m/44'/501'/0'/0'`, seed.toString('hex')).key;

      const keypair = Keypair.fromSeed(derivedSeed);

      const credential = {
        network: NetworksEnum.SOLANA,
        index: IndexEnum.SOLANA,
        address: keypair.publicKey.toBase58(),
        privateKey: bs58.encode(keypair.secretKey),
      };

      return credential;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async isAddress(address: string): Promise<boolean> {
    try {
      try {
        const publicKey = new PublicKey(address);

        return PublicKey.isOnCurve(publicKey.toBuffer());
      } catch (error) {
        return false;
      }
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);

      // Obtiene el balance en lamports (1 SOL = 1,000,000,000 lamports)
      const balanceLamports = await this.connection.getBalance(publicKey);

      console.log('BALANCE', balanceLamports);

      // Convierte de lamports a SOL
      const balance = balanceLamports / LAMPORTS_PER_SOL;

      return balance;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getBalanceToken(address: string, contractId: string, decimals: number): Promise<number> {
    try {
      const ownerPublicKey = new PublicKey(address);
      const contractPublicKey = new PublicKey(contractId);

      const addressToken = getAssociatedTokenAddressSync(contractPublicKey, ownerPublicKey);

      const tokenPublicKey = new PublicKey(addressToken.toBase58());

      try {
        const info = await getAccount(this.connection, tokenPublicKey);
        const amount = Number(info.amount);
        const mint = await getMint(this.connection, info.mint);
        const balance = amount / 10 ** mint.decimals;
        return balance;
      } catch (error) {
        return 0;
      }

      // Obtiene el balance en lamports (1 SOL = 1,000,000,000 lamports)
      // const balanceLamports = await connection.getBalance(publicKey);

      // console.log('BALANCE TOKEN SOL', balanceLamports);
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async transfer(fromAddress: string, privateKey: string, toAddress: string, amount: number): Promise<string> {
    try {
      // Convierte las direcciones a claves públicas
      const fromPublicKey = new PublicKey(fromAddress);
      const toPublicKey = new PublicKey(toAddress);

      // Convierte la privateKey en formato Base58 a Uint8Array
      const fromKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));

      // Convierte la cantidad de SOL a lamports (1 SOL = 1,000,000,000 lamports)
      const lamportsToSend = amount * LAMPORTS_PER_SOL;

      // Crea una transacción
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: lamportsToSend, // Enviar en lamports
        }),
      );

      // Envía y confirma la transacción
      const signature = await sendAndConfirmTransaction(this.connection, transaction, [fromKeypair]);

      return signature; // Regresa el hash de la transacción (signature)
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
