import { HttpService } from "@nestjs/axios";
import { All, Controller, Req, Res } from "@nestjs/common";
import { ConsulService } from "apps/infrastructure/consul/consul.service";
import { firstValueFrom } from "rxjs";

// proxy.controller.ts
@Controller()
export class ProxyController {
  constructor(
    private httpService: HttpService,
    private consulService: ConsulService
  ) {}

  @All(['orders', 'orders/*path'])
  async forwardToOrderService(
    @Req() req: any,
    @Res({ passthrough: true }) res: any) {
    const services = await this.consulService.discoverService('order-service');
    const { Address, ServicePort } = services[0];

    const response = await firstValueFrom(
      this.httpService.request({
        method: req.method,
        url: `http://${Address}:${ServicePort}${req.path}`,
        data: req.body,
      })
    );
    res.json(response.data);
  }

  @All(['inventory', 'inventory/*path'])
  async forwardToInventoryService(
    @Req() req: any,
    @Res({ passthrough: true }) res: any) {
    const services = await this.consulService.discoverService('inventory-service');
    const { Address, ServicePort } = services[0];

    const response = await firstValueFrom(
      this.httpService.request({
        method: req.method,
        url: `http://${Address}:${ServicePort}${req.path}`,
        data: req.body,
      })
    );
    res.json(response.data);
  }
}