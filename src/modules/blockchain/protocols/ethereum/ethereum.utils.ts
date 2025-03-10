import { Account, Contract, keyStores, utils } from 'near-api-js';
import { Action, createTransaction, functionCall } from 'near-api-js/lib/transaction';
import { KeyPair, PublicKey } from 'near-api-js/lib/utils';
import { ConnectedWalletAccount, Near, WalletConnection } from 'near-api-js';
const BN = require('bn.js');
import { Injectable } from '@nestjs/common';

@Injectable()
export class EthereumUtils {}
