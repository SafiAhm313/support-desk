import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLoginAttempts1790400000001 implements MigrationInterface {
    name = 'CreateLoginAttempts1790400000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "login_attempts" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_login_attempts_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_login_attempts_email_created_at" ON "login_attempts" ("email", "created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_login_attempts_email_created_at"`);
        await queryRunner.query(`DROP TABLE "login_attempts"`);
    }
}
