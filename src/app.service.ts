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
  private readonly REQUEST_DELAY = 2000; // 2 seconds delay between requests

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

    // Randomly select 2 different genres
    const selectedGenres = [];
    while (selectedGenres.length < 2) {
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

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getTopComment(permalink: string): Promise<any> {
    try {
      console.log(`Requesting comment: ${permalink}`);
      // Add delay before making the request
      await this.delay(this.REQUEST_DELAY);

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
      if (error.response?.status === 429) {
        console.log(
          `Rate limited when fetching comments for ${permalink}, skipping comments`,
        );
        return null;
      }
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
        console.log(`Requesting subreddit: ${subreddit}`);
        // Add delay before making the request
        await this.delay(this.REQUEST_DELAY);

        const response = await firstValueFrom(
          this.httpService.get(
            `https://www.reddit.com/r/${subreddit}/top.json?limit=5&t=month`,
          ),
        );

        for (const child of response.data.data.children) {
          if (child.data.selftext !== '') {
            // Only fetch comments if we haven't hit rate limits recently
            const topComment = await this.getTopComment(child.data.permalink);

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
        if (error.response?.status === 429) {
          console.log(
            `Rate limited when fetching subreddit ${subreddit}, trying next subreddit`,
          );
          continue;
        }
        console.error(`Error fetching from r/${subreddit}:`, error.message);
      }
    }

    // Return top 5 posts across all selected subreddits
    return [
      allTopics.sort((a, b) => b.score - a.score).slice(0, 5),
      selectedSubreddits,
    ];
  }

  private convertTechStackToArray(techStack: any): string[] {
    if (Array.isArray(techStack)) {
      return techStack;
    }

    // If techStack is an object, convert it to array of strings
    if (typeof techStack === 'object' && techStack !== null) {
      return Object.entries(techStack)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map((v) => `${key}: ${v}`);
          }
          return `${key}: ${value}`;
        })
        .flat();
    }

    return [];
  }

  async generateIdeas(): Promise<void> {
    // Generate 10 different ideas, each based on different subreddits
    for (let i = 0; i < 5; i++) {
      try {
        const [topics, selectedSubreddits] = await this.getRedditTopics();

        // If we couldn't get any topics, skip this iteration
        if (topics.length === 0) {
          console.log(`No topics found for iteration ${i + 1}, skipping`);
          continue;
        }
        console.log('Generate Idea from ', selectedSubreddits);
        const prompt = `Based on these current trending topics from Reddit:
${topics.map((t) => `- ${t.title}\n ${t.selftext} (from r/${t.subreddit})\n  Top comment: "${t.topComment?.text || 'No comments'}" with ${t.topComment?.score || 0} upvotes`).join('\n')}

Generate 1 unique and innovative web application idea that solves a real problem or addresses an interesting opportunity based on these topics. Meets these criteria:
Requirements:
      1. Can be built as MVP in 2-4 weeks by a single developer
      2. Uses common tech stack (React, Node.js, basic DB)
      3. Has clear monetization potential
      4. Starts simple but can scale
      5. Solves a specific problem

      Provide:
      1. Title: Clear, concise name
      2. Description: 2-3 sentences explaining core functionality
      3. MVP Features: 3-4 core features for first release
      4. Tech Stack: List of technologies needed (as array of strings)
      5. Complexity Score: 1-5 (1 being simplest)
      
      Format as JSON object.`;
        const completion = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        });

        const ideasText =
          completion.content[0].type === 'text'
            ? completion.content[0].text
            : '';
        const idea = JSON.parse(ideasText);

        // Create a new AppIdea instance
        const appIdea = new AppIdea();
        appIdea.title = idea.title;
        appIdea.description = idea.description;
        appIdea.subreddits = selectedSubreddits;
        appIdea.mvpFeatures = idea.mvpFeatures;
        appIdea.techStack = this.convertTechStackToArray(idea.techStack);
        appIdea.complexityScore = idea.complexityScore;

        // Save the entity
        await this.appIdeaRepository.save(appIdea);

        // Add delay between iterations
        await this.delay(this.REQUEST_DELAY);
      } catch (error) {
        console.error(`Error in iteration ${i + 1}:`, error);
        // Continue with next iteration instead of throwing
        continue;
      }
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
