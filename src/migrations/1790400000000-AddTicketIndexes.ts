import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketIndexes1790400000000 implements MigrationInterface {
    name = 'AddTicketIndexes1790400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_tickets_status" ON "tickets" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_priority" ON "tickets" ("priority")`);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_assignee_id" ON "tickets" ("assignee_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_tickets_due_at" ON "tickets" ("due_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_due_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_assignee_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_priority"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_tickets_status"`);
    }
}
