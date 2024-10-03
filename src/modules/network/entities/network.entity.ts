import { Entity, Column, PrimaryGeneratedColumn, BaseEntity, CreateDateColumn } from 'typeorm';
import { NetworksEnum } from '../enums/networks.enum';

@Entity({ name: 'networks' })
export class NetworkEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: NetworksEnum,
  })
  name!: NetworksEnum;

  @Column({
    nullable: false,
    unique: true,
  })
  symbol!: string;

  @Column({
    nullable: true,
  })
  image!: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
