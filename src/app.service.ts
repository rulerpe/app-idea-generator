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
  private readonly popularSubreddits = [
    // 'technology',
    // 'programming',
    'webdev',
    // 'startups',
    // 'futurology',
  ];

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

  private async getTopComment(permalink: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://www.reddit.com${permalink}.json`),
      );
      const comments = response.data[1].data.children;
      if (comments.length === 0) return null;

      // Find the comment with the highest score
      // const topComment = comments.reduce((prev, current) => {
      //   return prev.data.score > current.data.score ? prev : current;
      // });

      return {
        text: comments[0].data.body,
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

    for (const subreddit of this.popularSubreddits) {
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
              selftext: child.data.selftext,
              score: child.data.score,
              topComment: topComment,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching from r/${subreddit}:`, error.message);
      }
    }

    return allTopics.slice(0, 10);
  }

  async generateIdeas(): Promise<void> {
    const topics = await this.getRedditTopics();

    const prompt = `Based on these current trending topics from Reddit:
${topics.map((t) => `- ${t.title}\n ${t.selftext} (from r/${t.subreddit})\n  Top comment: "${t.topComment?.text || 'No comments'}" with ${t.topComment?.score || 0} upvotes`).join('\n')}

Generate 10 unique and innovative web application ideas that solve real problems or address interesting opportunities. For each idea, provide:
1. A clear title
2. A brief description of the concept
3. How it relates to or was inspired by the trending topics

Format each idea as a JSON object with "title" and "description" fields.`;
    console.log('prompt', prompt);
    try {
      console.log(
        'process.env.ANTHROPIC_API_KEY',
        this.configService.get<string>('ANTHROPIC_API_KEY'),
      );
      const completion = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const ideasText =
        completion.content[0].type === 'text' ? completion.content[0].text : '';

      let ideas;

      try {
        const jsonMatch = ideasText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          ideas = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (error) {
        console.error('Error parsing Claude response:', error);
        return;
      }

      for (const idea of ideas) {
        await this.appIdeaRepository.save({
          title: idea.title,
          description: idea.description,
        });
      }
    } catch (error) {
      console.error('Error generating ideas:', error);
    }
  }

  async getStoredIdeas() {
    const ideas = await this.appIdeaRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    // Parse the subredditData back to JSON
    return ideas;
  }
}
