import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class AppIdea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column('text', { array: true, default: '{}' })
  subreddits: string[];

  @Column('text', { array: true, default: '{}' })
  mvpFeatures: string[];

  @Column('text', { array: true, default: '{}' })
  techStack: string[];

  @Column('int', { default: 1 })
  complexityScore: number;

  @CreateDateColumn()
  createdAt: Date;
}
