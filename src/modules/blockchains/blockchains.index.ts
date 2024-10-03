import { NearService } from './near/near.service';
import { NearUtils } from './near/near.utils';

export const blockchainsIndex = {
  near: new NearService(new NearUtils()),
};
