import { forwardRef, Module } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { WebSocketGatewayService } from './websocket-gateway.service';
import { PosModule } from 'src/modules/pos/pos.module';

@Module({
  imports: [forwardRef(() => PosModule)],
  providers: [WebSocketGatewayService],
  exports: [WebSocketGatewayService],
})
export class WebsocketModule {}
