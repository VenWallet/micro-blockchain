import { Entity, Column, PrimaryGeneratedColumn, BaseEntity, CreateDateColumn, ManyToMany } from 'typeorm';
import { TokenEntity } from 'src/modules/token/entities/token.entity';
import { SpotMarketStatusEnum } from '../enums/spotMarketStatus.enum';
import { OrderTypeEnum } from '../enums/orderType.enum';
import { ExchangeTypeEnum } from '../enums/exchangeType.enum';

@Entity({ name: 'spot_market' })
export class SpotMarketEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    nullable: false,
  })
  userId: string;

  @Column({
    type: 'enum',
    name: 'order_type',
    enum: OrderTypeEnum,
  })
  orderType: OrderTypeEnum;

  @Column({
    name: 'from_network',
    nullable: false,
  })
  fromNetwork: string;

  @Column({
    name: 'to_network',
    nullable: false,
  })
  toNetwork: string;

  @Column({
    name: 'from_coin',
    nullable: false,
  })
  fromCoin: string;

  @Column({
    name: 'to_coin',
    nullable: false,
  })
  toCoin: string;

  @Column({
    nullable: false,
  })
  amount: string;

  @Column({
    nullable: false,
  })
  hash: string;

  @Column({
    type: 'enum',
    name: 'exchange_type',
    enum: ExchangeTypeEnum,
    default: ExchangeTypeEnum.EXCHANGE,
  })
  exchangeType: ExchangeTypeEnum;

  @Column({
    type: 'enum',
    enum: SpotMarketStatusEnum,
    default: SpotMarketStatusEnum.PENDING,
  })
  status: SpotMarketStatusEnum;

  @Column({
    nullable: true,
  })
  symbol: string;

  @Column({
    nullable: true,
  })
  side: string;

  @Column({
    nullable: true,
  })
  price: string;

  @Column({
    nullable: true,
  })
  quantity: string;

  @Column({
    name: 'order_data',
    type: 'jsonb',
    nullable: true,
  })
  orderData: any;

  @Column({
    name: 'withdraw_data',
    type: 'jsonb',
    nullable: true,
  })
  withdrawData: any;

  @CreateDateColumn()
  timestamp: Date;
}
