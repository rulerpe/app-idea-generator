import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { firstValueFrom } from 'rxjs';
import { AppIdea } from './entities/app-idea.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly anthropic: Anthropic;
  private readonly MAX_TEXT_LENGTH = 300;
  private readonly MAX_COMMENT_LENGTH = 200;

  private readonly subredditsByGenre = {
    technology: [
      'homelab',
      'selfhosted',
      'homeautomation',
      'mechanicalkeyboards',
      'dataisbeautiful',
    ],
    business: [
      'smallbusiness',
      'startup',
      'freelance',
      'digitalnomad',
      'entrepreneur',
    ],
    gaming: [
      'patientgamers',
      'gamedev',
      'emulation',
      'minipainting',
      'boardgamedesign',
    ],
    education: [
      'languagelearning',
      'italianlearning',
      'artfundamentals',
      'learnprogramming',
      'learnpython',
    ],
    lifestyle: [
      'onebag',
      'simpleliving',
      'konmari',
      'zerowaste',
      'vandwellers',
    ],
    health: [
      'bodyweightfitness',
      'flexibility',
      'posture',
      'eatcheapandhealthy',
      'mealprepsunday',
    ],
    hobbies: [
      'woodworking',
      'leathercraft',
      'homebrewing',
      'mycology',
      'fermentation',
    ],
    creative: [
      'watercolor101',
      'songwriting',
      'screenwriting',
      'polymerclay',
      'photography',
    ],
    outdoors: [
      'bushcraft',
      'urbangardening',
      'houseplants',
      'solotravel',
      'japantraveltips',
    ],
  };

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(AppIdea)
    private appIdeaRepository: Repository<AppIdea>,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('api.anthropic.key'),
    });
  }

  private getRandomSubreddits(): string[] {
    // Get all genres
    const genres = Object.keys(this.subredditsByGenre);

    // Randomly select 3 different genres
    const selectedGenres = [];
    while (selectedGenres.length < 3) {
      const randomGenre = genres[Math.floor(Math.random() * genres.length)];
      if (!selectedGenres.includes(randomGenre)) {
        selectedGenres.push(randomGenre);
      }
    }

    // For each selected genre, randomly select one subreddit
    return selectedGenres.map((genre) => {
      const subreddits = this.subredditsByGenre[genre];
      return subreddits[Math.floor(Math.random() * subreddits.length)];
    });
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private async getTopComment(permalink: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://www.reddit.com${permalink}.json`),
      );
      const comments = response.data[1].data.children;
      if (comments.length === 0) return null;

      return {
        text: this.truncateText(comments[0].data.body, this.MAX_COMMENT_LENGTH),
        score: comments[0].data.score,
      };
    } catch (error) {
      console.error(
        `Error fetching comments for post ${permalink}:`,
        error.message,
      );
      return null;
    }
  }

  async getRedditTopics(): Promise<any[]> {
    const allTopics = [];
    const selectedSubreddits = this.getRandomSubreddits();

    for (const subreddit of selectedSubreddits) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `https://www.reddit.com/r/${subreddit}/top.json?limit=20&t=month`,
          ),
        );

        for (const child of response.data.data.children) {
          const topComment = await this.getTopComment(child.data.permalink);
          if (child.data.selftext !== '') {
            allTopics.push({
              title: child.data.title,
              subreddit: child.data.subreddit,
              selftext: this.truncateText(
                child.data.selftext,
                this.MAX_TEXT_LENGTH,
              ),
              score: child.data.score,
              topComment: topComment,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error.message);
      }
    }

    // Return top 5 posts across all selected subreddits
    return [
      allTopics.sort((a, b) => b.score - a.score).slice(0, 5),
      selectedSubreddits,
    ];
  }

  async generateIdeas(): Promise<void> {
    const [topics, selectedSubreddits] = await this.getRedditTopics();

    const prompt = `Based on these current trending topics from Reddit:
${topics.map((t) => `- ${t.title}\n ${t.selftext} (from r/${t.subreddit})\n  Top comment: "${t.topComment?.text || 'No comments'}" with ${t.topComment?.score || 0} upvotes`).join('\n')}

Generate 10 unique and innovative web application ideas that solve real problems or address interesting opportunities. For each idea, provide:
1. A clear title
2. A brief description of the concept

Format each idea as a JSON object with "title", "description" fields. example [{"title": "ideatitle1", "description": "ideadescription"}]`;

    try {
      const completion = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const ideasText =
        completion.content[0].type === 'text' ? completion.content[0].text : '';
      const ideas = JSON.parse(ideasText);

      for (const idea of ideas) {
        // Create a new AppIdea instance
        const appIdea = new AppIdea();
        appIdea.title = idea.title;
        appIdea.description = idea.description;
        appIdea.subreddits = selectedSubreddits;

        // Save the entity
        await this.appIdeaRepository.save(appIdea);
      }
    } catch (error) {
      console.error('Error generating ideas:', error);
      throw error;
    }
  }

  async getStoredIdeas() {
    const ideas = await this.appIdeaRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return ideas;
  }
}
