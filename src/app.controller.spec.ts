import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getStoredIdeas: jest.fn().mockResolvedValue([
              {
                id: 1,
                title: 'Test App Idea',
                description: 'A test description',
                createdAt: new Date(),
              },
            ]),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getIdeas', () => {
    it('should return array of ideas', async () => {
      const result = await appController.getIdeas();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].title).toBe('Test App Idea');
      expect(appService.getStoredIdeas).toHaveBeenCalled();
    });
  });
});
