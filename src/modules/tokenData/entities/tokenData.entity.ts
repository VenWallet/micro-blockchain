import { Entity, Column, PrimaryGeneratedColumn, BaseEntity, CreateDateColumn, ManyToMany } from 'typeorm';
import { TokensEnum } from '../enums/tokens.enum';
import { IndexTokenEnum } from '../enums/indexToken.enum';
import { TokenEntity } from 'src/modules/token/entities/token.entity';

@Entity({ name: 'token_data' })
export class TokenDataEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    nullable: false,
    unique: true,
  })
  name!: string;

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
