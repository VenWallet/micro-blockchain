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
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionMessage,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

@Injectable()
export class SolanaService implements ProtocolInterface {
  private readonly connection: Connection;

  constructor() {
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
      console.log(await this.getNumberDecimals(contract));

      const contractPublicKey = new PublicKey(contract);

      // const fromPublicKey = new PublicKey(fromAddress);
      const fromKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      const toPublicKey = new PublicKey(toAddress);

      const sourceAccount = getAssociatedTokenAddressSync(contractPublicKey, fromKeypair.publicKey);

      console.log('privateKey', privateKey);

      // const ownerPublicKey = new PublicKey(fromAddress);
      // const contractPublicKey = new PublicKey(contract);

      // const addressToken = getAssociatedTokenAddressSync(contractPublicKey, ownerPublicKey);

      contract = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      console.log('contract', contract);

      // let sourceAccount2 = await getOrCreateAssociatedTokenAccount(
      //   this.connection,
      //   fromKeypair,
      //   new PublicKey(contract),
      //   fromKeypair.publicKey,
      // );

      console.log('sourceAccount', sourceAccount);

      throw new Error('Method not implemented.');
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransfer(): Promise<number> {
    try {
      const connection = new Connection(clusterApiUrl('mainnet-beta'));

      // Crea un remitente ficticio para calcular el mensaje
      const payer = Keypair.generate();

      // Define un mensaje de transacción simple (transferencia de SOL)
      const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: payer.publicKey, // Dirección ficticia
        toPubkey: new PublicKey('11111111111111111111111111111111'), // Dirección genérica
        lamports: 1, // Cantidad mínima para simular
      });

      // Crea un mensaje de transacción basado en el bloque reciente
      const message = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: recentBlockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      // Obtén el costo de la transacción en lamports
      const { value: feeInLamports } = await connection.getFeeForMessage(message);

      if (feeInLamports === null) {
        throw new Error('No se pudo obtener el costo de la transacción.');
      }

      // Convierte de lamports a SOL
      const feeInSOL = feeInLamports / 1_000_000_000; // 1 SOL = 1,000,000,000 lamports
      return feeInSOL;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  async getFeeTransferToken(): Promise<number> {
    try {
      const connection = new Connection(clusterApiUrl('mainnet-beta'));

      // Generar claves ficticias para simulación
      const payer = Keypair.generate(); // Paga los fees
      const sourceTokenAccount = Keypair.generate().publicKey; // Cuenta de origen
      const destinationTokenAccount = Keypair.generate().publicKey; // Cuenta destino

      // Cantidad a transferir (en la unidad mínima del token, bigInt si es necesario)
      const amount = 1; // Mínima cantidad para la simulación

      // Obtén el último blockhash
      const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Instrucción para transferir tokens SPL
      const transferInstruction = createTransferInstruction(
        sourceTokenAccount, // Cuenta de origen
        destinationTokenAccount, // Cuenta destino
        payer.publicKey, // Propietario de la cuenta de origen
        amount, // Cantidad de tokens a transferir
        [], // Multisigners (vacío para este caso)
        TOKEN_PROGRAM_ID, // Programa de tokens SPL
      );

      // Crea el mensaje de transacción
      const message = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: recentBlockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      // Calcula el costo de la transacción en lamports
      const { value: feeInLamports } = await connection.getFeeForMessage(message);

      if (feeInLamports === null) {
        throw new Error('No se pudo calcular el costo de la transacción.');
      }

      // Convierte de lamports a SOL
      const feeInSOL = feeInLamports / 1_000_000_000; // 1 SOL = 1,000,000,000 lamports
      return feeInSOL;
    } catch (error) {
      throw new ExceptionHandler(error);
    }
  }

  previewSwap(fromCoin: string, toCoin: string, amount: number, address: string | undefined): Promise<any> {
    throw new Error('Method not implemented.');
  }

  private async getNumberDecimals(mintAddress: string): Promise<number> {
    const info = await this.connection.getParsedAccountInfo(new PublicKey(mintAddress));
    const result = (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
    return result;
  }

  swap(priceRoute: any, privateKey: string, address: string): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
