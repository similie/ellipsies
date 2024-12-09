/* eslint-disable */
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("variable_pkey", ["id"], { unique: true })
@Entity("variable", { schema: "public" })
export class VariableModel {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  public id: number;

  @Column("text", { name: "key", nullable: true })
  key: string | null;

  @Column("json", { name: "value", nullable: true })
  value: object | null;

  @Column("integer", { name: "order", nullable: true })
  order: number | null;

  @Column("text", { name: "identity", nullable: true })
  identity: string | null;

  @Column("boolean", { name: "locked", nullable: true })
  locked: boolean | null;

  @Column("integer", { name: "domain", nullable: true })
  domain: number | null;

  @Column("json", { name: "meta", nullable: true })
  meta: object | null;
}
