import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosSettingsEntity } from './entities/posSettings.entity';
import { PosSettingsService } from './services/posSettings.service';
import { PosSettingsRepository } from './repositories/posSettings.repository';
import { PosSettingsController } from './controllers/pos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PosSettingsEntity])],
  exports: [PosSettingsService, PosSettingsRepository],
  controllers: [PosSettingsController],
  providers: [PosSettingsService, PosSettingsRepository],
})
export class PosSettingsModule {}
