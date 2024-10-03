import { NetworkEntity } from 'src/modules/network/entities/network.entity';
import { Entity, Column, PrimaryGeneratedColumn, BaseEntity, CreateDateColumn, ManyToOne } from 'typeorm';

@Entity({ name: 'wallets' })
export class WalletEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'user_id',
    nullable: false,
    unique: true,
  })
  userId!: string;

  @Column({
    nullable: false,
    unique: true,
  })
  address!: string;

  @ManyToOne(() => NetworkEntity)
  network: NetworkEntity;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;
}
