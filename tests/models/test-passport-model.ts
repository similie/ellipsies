/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable object-curly-spacing */

import {
  EllipsiesBaseModelID,
  EllipsiesBaseModel,
  Column,
  ManyToOne,
  Entity,
  JoinColumn,
} from "../../index";
import { hashPassword } from "@similie/shared-microservice-utils";
import { Exclude } from "class-transformer";
import { UserModel, type IUser } from "./test-user-model";
import { IModelType } from "@similie/model-connect-entities";

export interface IPassport extends EllipsiesBaseModel {
  protocol: any;
  password?: string;
  accessToken?: string;
  provider?: any;
  identifier?: string;
  tokens?: any;
  inactive?: boolean;
  user: IModelType<IUser>;
}

@Entity("passport", { schema: "public" })
export class PassportModel extends EllipsiesBaseModelID {
  @Column("text", { name: "protocol", nullable: true, default: "local" })
  public protocol: string | null;
  @Exclude()
  @Column("text", { name: "password", nullable: true })
  public password: string | null;

  @Column("text", { name: "accessToken", nullable: true })
  public accessToken: string | null;

  @Column("text", { name: "provider", nullable: true })
  public provider: string | null;

  @Column("text", { name: "identifier", nullable: true })
  public identifier: string | null;

  @Column("json", { name: "tokens", nullable: true, default: {} })
  public tokens: object | null;

  @Column("boolean", { name: "inactive", nullable: true, default: false })
  public inactive: boolean | null;

  @Column("integer", { name: "user", nullable: true })
  @ManyToOne(() => UserModel, (user: UserModel) => user.passports)
  @JoinColumn({ name: "user" })
  public user: UserModel;

  public static hashPassword(password: string) {
    return hashPassword(password);
  }

  public static async hashManyPasswords(passports: Partial<PassportModel[]>) {
    for (const passport of passports) {
      if (!passport) {
        continue;
      }
      const hash = await PassportModel.hashPassword(passport?.password || "");
      passport.password = hash;
    }
  }

  public static async hashOneOrManyPasswords(
    passports: Partial<PassportModel | PassportModel[]>,
  ) {
    if (!passports) {
      throw new Error("No password to hash");
    }
    if (Array.isArray(passports)) {
      return this.hashManyPasswords(passports);
    }
    passports.password = await PassportModel.hashPassword(
      passports?.password || "",
    );
  }
}
