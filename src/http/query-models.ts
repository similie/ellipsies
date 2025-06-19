import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  BaseEntity,
  BeforeInsert,
  BeforeUpdate,
} from "@similie/pg-microservice-datasource";
import { EllipsiesBaseModel, UUID } from "./query-types";

export abstract class EllipsiesDateModel extends BaseEntity {
  @CreateDateColumn()
  @Column("timestamp with time zone", { name: "created_at" })
  public createdAt: Date;

  @UpdateDateColumn()
  @Column("timestamp with time zone", { name: "updated_at" })
  public updatedAt: Date;

  @BeforeInsert()
  public setCreatedAt() {
    this.createdAt = new Date();
    this.updatedAt = this.createdAt;
  }

  @BeforeUpdate()
  public setUpdatedAt() {
    this.updatedAt = new Date();
  }
}

export abstract class EllipsiesBaseModelID
  extends EllipsiesDateModel
  implements EllipsiesBaseModel
{
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  public id: number;
}

export abstract class EllipsiesBaseModelUUID
  extends EllipsiesDateModel
  implements EllipsiesBaseModel
{
  @PrimaryGeneratedColumn("uuid")
  public id: UUID;
}
