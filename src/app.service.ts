import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { firstValueFrom } from 'rxjs';
import { FirestoreService } from './services/firestore.service';
import { AppIdea } from './interfaces/app-idea.interface';

@Injectable()
export class AppService {
  private readonly anthropic: Anthropic;
  private readonly MAX_TEXT_LENGTH = 300;
  private readonly MAX_COMMENT_LENGTH = 200;
  private readonly REQUEST_DELAY = 2000;

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
    private readonly firestoreService: FirestoreService,
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

  async generateIdeas(): Promise<void> {
    for (let i = 0; i < 1; i++) {
      try {
        const [topics, selectedSubreddits] = await this.getRedditTopics();

        if (topics.length === 0) {
          console.log(`No topics found for iteration ${i + 1}, skipping`);
          continue;
        }

        console.log('Generate Idea from ', selectedSubreddits);
        const prompt = `Based on these current trending topics from Reddit:
${topics
  .map(
    (t) =>
      `- ${t.title}\n ${t.selftext} (from r/${t.subreddit})\n  Top comment: "${
        t.topComment?.text || 'No comments'
      }" with ${t.topComment?.score || 0} upvotes`,
  )
  .join('\n')}

Generate 1 unique and innovative web application idea that solves a real problem or addresses an interesting opportunity based on these topics. The idea should be practical and implementable.

Requirements:
1. Can be built as MVP in 1-2 weeks by a single developer
2. Uses common tech stack (React, Node.js, basic DB)
3. Has clear monetization potential
4. Starts simple but can scale
5. Solves a specific problem

Response in JSON format as below:
{
  "title": "Brief but descriptive app name",
  "description": "A comprehensive 2-3 sentence overview of the application, its core functionality, and its value proposition",
  "mvpFeatures": [
    "List of 3-5 essential features for MVP, each described in detail with clear acceptance criteria"
  ],
  "techStack": [
    "Frontend: Required frontend technologies (e.g., React, Redux, TailwindCSS)",
    "Backend: Required backend technologies (e.g., Node.js, Express)",
    "Database: Database requirements (e.g., PostgreSQL, MongoDB)",
    "APIs: Required external APIs or services"
  ]
}`;

        const completion = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        });

        const ideasText = completion.content[0].type === 'text' 
          ? completion.content[0].text 
          : '';
        const idea = JSON.parse(ideasText);

        // Create a new AppIdea document
        const appIdea: AppIdea = {
          title: idea.title,
          description: idea.description,
          subreddits: selectedSubreddits,
          mvpFeatures: idea.mvpFeatures,
          techStack: Array.isArray(idea.techStack)
            ? idea.techStack
            : Object.entries(idea.techStack).map(([key, value]) => `${key}: ${value}`),
          createdAt: new Date(),
        };

        // Save to Firestore
        await this.firestoreService
          .collection('app-ideas')
          .add(appIdea);

        await this.delay(this.REQUEST_DELAY);
      } catch (error) {
        console.error(`Error in iteration ${i + 1}:`, error);
        continue;
      }
    }
  }

  async getStoredIdeas(): Promise<AppIdea[]> {
    const snapshot = await this.firestoreService
      .collection('app-ideas')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AppIdea[];
  }
}
