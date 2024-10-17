import { Account } from 'near-api-js';
import * as dotenv from 'dotenv';
dotenv.config();

export class AccountService extends Account {
  public async signAndSendTrx(trx: any) {
    return await this.signAndSendTransaction(trx);
  }
}
