import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1788248327077 implements MigrationInterface {
    name = 'InitSchema1788248327077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "comments" ("id" SERIAL NOT NULL, "body" text NOT NULL, "is_internal" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ticket_id" integer NOT NULL, "author_id" integer NOT NULL, CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tags" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_d90243459a697eadb8ad56e9092" UNIQUE ("name"), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_events_from_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TYPE "public"."ticket_events_to_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TABLE "ticket_events" ("id" SERIAL NOT NULL, "from_status" "public"."ticket_events_from_status_enum", "to_status" "public"."ticket_events_to_status_enum" NOT NULL, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ticket_id" integer NOT NULL, "actor_id" integer, CONSTRAINT "PK_d61d07653b492eca67f9bad8ec2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_priority_enum" AS ENUM('low', 'normal', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" SERIAL NOT NULL, "subject" character varying NOT NULL, "body" text NOT NULL, "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'open', "priority" "public"."tickets_priority_enum" NOT NULL DEFAULT 'normal', "due_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "requester_id" integer NOT NULL, "assignee_id" integer, CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('customer', 'agent', 'admin')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ticket_tags" ("ticket_id" integer NOT NULL, "tag_id" integer NOT NULL, CONSTRAINT "PK_61ad5ce131d1032cd26448d073e" PRIMARY KEY ("ticket_id", "tag_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e834a1960b1abc5822d5055b82" ON "ticket_tags"  ("ticket_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f5cb86966f6eb9f24f011992d3" ON "ticket_tags"  ("tag_id") `);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_be8180d9b44a05e449b85f5b773" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_e6d38899c31997c45d128a8973b" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_9cf43c4478294faa98129c47c21" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_events" ADD CONSTRAINT "FK_f13e732854401f6f00cdd045f23" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_2a06f5cdaf003ceaa9fcf08be77" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_dff6e2b44c9b5e177114588772f" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_tags" ADD CONSTRAINT "FK_e834a1960b1abc5822d5055b82e" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "ticket_tags" ADD CONSTRAINT "FK_f5cb86966f6eb9f24f011992d38" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ticket_tags" DROP CONSTRAINT "FK_f5cb86966f6eb9f24f011992d38"`);
        await queryRunner.query(`ALTER TABLE "ticket_tags" DROP CONSTRAINT "FK_e834a1960b1abc5822d5055b82e"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_dff6e2b44c9b5e177114588772f"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_2a06f5cdaf003ceaa9fcf08be77"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_f13e732854401f6f00cdd045f23"`);
        await queryRunner.query(`ALTER TABLE "ticket_events" DROP CONSTRAINT "FK_9cf43c4478294faa98129c47c21"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_e6d38899c31997c45d128a8973b"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_be8180d9b44a05e449b85f5b773"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f5cb86966f6eb9f24f011992d3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e834a1960b1abc5822d5055b82"`);
        await queryRunner.query(`DROP TABLE "ticket_tags"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
        await queryRunner.query(`DROP TABLE "ticket_events"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_events_to_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ticket_events_from_status_enum"`);
        await queryRunner.query(`DROP TABLE "tags"`);
        await queryRunner.query(`DROP TABLE "comments"`);
    }

}
