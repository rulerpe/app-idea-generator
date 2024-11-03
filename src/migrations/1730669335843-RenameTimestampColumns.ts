import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTimestampColumns1730669335843 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('app_idea', 'created_at', 'createdAt');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('app_idea', 'createdAt', 'created_at');
  }
}
