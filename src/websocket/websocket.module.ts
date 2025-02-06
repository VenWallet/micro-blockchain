import { forwardRef, Module } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { WebsocketService } from './websocket.service';
import { PosModule } from 'src/modules/pos/pos.module';

@Module({
  imports: [forwardRef(() => PosModule)],
  providers: [WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
