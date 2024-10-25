import { Account } from 'near-api-js';

export class AccountService extends Account {
  public async signAndSendTrx(trx: any) {
    return await this.signAndSendTransaction(trx);
  }
}
