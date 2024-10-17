import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  BaseEntity,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TokenDataEntity } from 'src/modules/tokenData/entities/tokenData.entity';
import { NetworkEntity } from 'src/modules/network/entities/network.entity';

@Entity({ name: 'tokens' })
export class TokenEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    nullable: false,
    unique: true,
  })
  contract!: string;

  @Column({
    nullable: false,
  })
  decimals!: number;

  @ManyToOne(() => TokenDataEntity)
  @JoinColumn({ name: 'token_data_id' })
  tokenData!: TokenDataEntity;

  @ManyToOne(() => NetworkEntity, (network) => network.tokens)
  @JoinColumn({ name: 'network_id' })
  network: NetworkEntity;
}
