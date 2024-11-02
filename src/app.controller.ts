import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('generate')
  async generateIdeas() {
    await this.appService.generateIdeas();
    return { message: 'Ideas generated and stored successfully' };
  }

  @Get('ideas')
  async getIdeas() {
    return this.appService.getStoredIdeas();
  }
}
