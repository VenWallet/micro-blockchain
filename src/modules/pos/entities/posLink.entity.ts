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

@Entity({ name: 'pos_link' })
export class PosLinkEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    nullable: false,
  })
  userId: string;

  @Column({
    nullable: false,
  })
  title!: string;

  @Column({
    nullable: true,
  })
  description!: string;

  @Column({
    nullable: true,
  })
  image!: string;

  @Column({
    name: 'user_linked',
    nullable: true,
    unique: true,
  })
  userLinked: string;

  @Column({
    name: 'socket_id',
    nullable: true,
  })
  socketId: string;
}
