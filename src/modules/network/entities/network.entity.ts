import { Entity, Column, PrimaryGeneratedColumn, BaseEntity, CreateDateColumn, ManyToMany, OneToMany } from 'typeorm';
import { NetworksEnum } from '../enums/networks.enum';
import { IndexEnum } from '../enums/index.enum';
import { TokenEntity } from 'src/modules/token/entities/token.entity';

@Entity({ name: 'networks' })
export class NetworkEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: NetworksEnum,
    unique: true,
  })
  name!: NetworksEnum;

  @Column({
    nullable: false,
    unique: true,
  })
  symbol!: string;

  @Column({
    type: 'enum',
    enum: IndexEnum,
    unique: true,
  })
  index!: IndexEnum;

  @Column({
    nullable: false,
  })
  decimals!: number;

  @Column({
    nullable: true,
  })
  image!: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => TokenEntity, (token) => token.network)
  tokens!: TokenEntity[];
}
