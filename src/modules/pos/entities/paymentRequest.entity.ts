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

@Entity({ name: 'payment_request' })
export class PaymentRequestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    nullable: false,
  })
  userId: string;

  @ManyToOne(() => NetworkEntity)
  @JoinColumn({ name: 'network_id' })
  network: NetworkEntity;

  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: 'token_id' })
  token: TokenEntity;

  @Column({
    nullable: false,
  })
  amount!: number;

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
    name: 'socket_id',
    nullable: true,
  })
  socketId: string;

  @Column({
    nullable: true,
  })
  hash: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
