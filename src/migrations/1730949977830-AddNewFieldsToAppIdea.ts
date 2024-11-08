import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewFieldsToAppIdea1730949977830 implements MigrationInterface {
  name = 'AddNewFieldsToAppIdea1730949977830';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_idea" ADD "mvpFeatures" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app_idea" ADD "techStack" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "app_idea" ADD "complexityScore" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_idea" DROP COLUMN "complexityScore"`,
    );
    await queryRunner.query(`ALTER TABLE "app_idea" DROP COLUMN "techStack"`);
    await queryRunner.query(`ALTER TABLE "app_idea" DROP COLUMN "mvpFeatures"`);
  }
}
