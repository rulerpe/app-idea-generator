import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubredditsToAppIdea1730776060000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First add the column as nullable with default empty array
    await queryRunner.query(`
      ALTER TABLE "app_idea" 
      ADD COLUMN "subreddits" text[] DEFAULT ARRAY[]::text[];
    `);

    // Update any null values to empty array
    await queryRunner.query(`
      UPDATE "app_idea" 
      SET "subreddits" = ARRAY[]::text[] 
      WHERE "subreddits" IS NULL;
    `);

    // Set the column to not null
    await queryRunner.query(`
      ALTER TABLE "app_idea" 
      ALTER COLUMN "subreddits" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_idea" DROP COLUMN "subreddits";
    `);
  }
}
