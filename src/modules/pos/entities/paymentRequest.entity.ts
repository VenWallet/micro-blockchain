import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  CreateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TokenEntity } from 'src/modules/token/entities/token.entity';
import { NetworkEntity } from 'src/modules/network/entities/network.entity';
import { PaymentStatusEnum } from '../enums/paymentStatus.enum';
import { ExchangeTypeEnum } from 'src/modules/spotMarket/enums/exchangeType.enum';

@Entity({ name: 'payment_request' })
export class PaymentRequestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    nullable: false,
  })
  userId: string;

  @Column({
    name: 'ref_id',
    nullable: true,
  })
  refId: string;

  @ManyToOne(() => NetworkEntity)
  @JoinColumn({ name: 'network_id' })
  network: NetworkEntity;

  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: 'token_id' })
  token: TokenEntity;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: false,
  })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  fee: number;

  @Column({
    nullable: true,
  })
  note: string;

  @Column({
    type: 'enum',
    enum: PaymentStatusEnum,
    default: PaymentStatusEnum.PENDING,
  })
  status: PaymentStatusEnum;

  @Column({
    nullable: true,
    default: false,
  })
  isPaid: boolean;

  @Column({
    name: 'socket_id',
    nullable: true,
  })
  socketId: string;

  @Column({
    nullable: true,
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

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
