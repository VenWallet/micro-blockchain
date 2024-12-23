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

@Entity({ name: 'pos_settings' })
export class PosSettingsEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    nullable: false,
    unique: true,
  })
  userId: string;

  @ManyToOne(() => NetworkEntity)
  @JoinColumn({ name: 'network_id' })
  network: NetworkEntity;

  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: 'token_id' })
  token: TokenEntity;

  @ManyToOne(() => NetworkEntity)
  @JoinColumn({ name: 'network_id_ext' })
  network_ext: NetworkEntity;

  @ManyToOne(() => TokenEntity)
  @JoinColumn({ name: 'token_id_ext' })
  token_ext: TokenEntity;
}
