/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Entity,
  Index,
  Column,
  OneToMany,
  JoinColumn,
  ManyToOne,
  BeforeInsert,
  EllipsiesBaseModelID,
  EllipsiesBaseModel,
} from "../../index";
import { apiToken } from "@similie/shared-microservice-utils";
import { PassportModel, type IPassport } from "./test-passport-model";
import { IModelCollection, IModelType } from "@similie/model-connect-entities";

export interface IUser extends EllipsiesBaseModel {
  userName?: string;
  lastDomain?: number;
  email?: string;
  phone?: string;
  passports?: IModelCollection<IPassport>;
  dob?: Date;
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  role: number;
  siteRole?: number;
  preferredLanguage?: string;
  online?: boolean;
  active?: boolean;
  archive?: boolean;
  requestor?: IModelType<IUser>;
  sessionKey?: string;
  apiSession?: string;
  apiKey?: string;
  avatar?: any;
  rankBadge?: number;
  organization?: number;
  sounds?: boolean;
  personnel?: boolean;
  userAccessDisabled?: boolean;
  enlistementDate?: Date;
  primaryStationRoute?: boolean;
  specialty?: number;
  trade?: number;
  styleMode?: string;
  ldapEnabled?: boolean;
  location?: any;
}

@Index("user_api_key_key", ["apiKey"], { unique: true })
@Index("user_email_key", ["email"], { unique: true })
@Index("user_pkey", ["id"], { unique: true })
@Index("user_username_key", ["userName"], { unique: true })
@Entity("user", { schema: "public" })
export class UserModel extends EllipsiesBaseModelID {
  @Column("text", { name: "username", nullable: true, unique: true })
  public userName: string | null;

  @Column("integer", { name: "last_domain", nullable: true })
  public lastDomain: number | null;

  @Column("text", { name: "email", nullable: true, unique: true })
  public email: string | null;

  @Column("text", { name: "phone", nullable: true })
  public phone: string | null;

  @Column("text", { name: "secondary_email", nullable: true })
  public secondaryEmail: string | null;

  @Column("text", { name: "secondary_phone", nullable: true })
  public secondaryPhone: string | null;

  @Column("timestamp with time zone", { name: "dob", nullable: true })
  public dob: Date | null;

  @Column("text", { name: "title", nullable: true })
  public title: string | null;

  @Column("text", { name: "first_name", nullable: true })
  public firstName: string | null;

  @Column("text", { name: "middle_name", nullable: true })
  public middleName: string | null;

  @Column("text", { name: "last_name", nullable: true })
  public lastName: string | null;

  @Column("integer", { name: "role", nullable: true })
  public role: number | null;

  @Column("integer", { name: "site_role", nullable: true })
  public siteRole: number | null;

  @Column("text", { name: "preferred_language", nullable: true })
  public preferredLanguage: string | null;

  @Column("boolean", { name: "online", nullable: true, default: false })
  public online: boolean | null;

  @Column("boolean", { name: "active", nullable: true, default: true })
  public active: boolean | null;

  @Column("boolean", { name: "archive", nullable: true, default: false })
  public archive: boolean | null;

  @ManyToOne(() => UserModel, (user: UserModel) => user.id, { nullable: true })
  @JoinColumn({ name: "requestor" })
  public requestor: UserModel | null | number;

  @Column("text", { name: "session_key", nullable: true })
  public sessionKey: string | null;

  @Column("text", { name: "api_session", nullable: true })
  public apiSession: string | null;

  @Column("text", { name: "api_key", nullable: true, unique: true })
  public apiKey: string | null;

  @Column("json", { name: "avatar", nullable: true })
  public avatar: object | null;

  @Column("integer", { name: "rank_badge", nullable: true })
  public rankBadge: number | null;

  @Column("integer", { name: "organization", nullable: true })
  public organization: number | null;

  @Column("boolean", { name: "sounds", nullable: true, default: true })
  public sounds: boolean | null;

  @Column("text", { name: "employee_id", nullable: true })
  public employeeId: string | null;

  @Column("boolean", { name: "force_reset", nullable: true, default: false })
  public forceReset: boolean | null;

  @Column("integer", { name: "schema", nullable: true, default: null })
  public schema: number | null;

  @Column("text", { name: "primary_district", nullable: true })
  public primaryDistrict: string | null;

  // eslint-disable-next-line object-curly-spacing
  @Column("json", { name: "meta", nullable: true, default: {} })
  public meta: object | null;

  @Column("boolean", { name: "personnel", nullable: true })
  public personnel: boolean | null;

  @Column("boolean", { name: "user_access_disabled", nullable: true })
  public userAccessDisabled: boolean | null;

  @Column("timestamp with time zone", {
    name: "enlistement_date",
    nullable: true,
  })
  public enlistementDate: Date | null;

  @Column("boolean", { name: "primary_station_route", nullable: true })
  public primaryStationRoute: boolean | null;

  @Column("integer", { name: "specialty", nullable: true })
  public specialty: number | null;

  @Column("integer", { name: "trade", nullable: true })
  public trade: number | null;

  @Column("text", { name: "style_mode", nullable: true })
  public styleMode: string | null;

  @Column("boolean", { name: "ldap_enabled", nullable: true, default: false })
  public ldapEnabled: boolean | null;

  @OneToMany(() => PassportModel, (passport: PassportModel) => passport.user)
  // @JoinColumn({ name: "id" })
  public passports: PassportModel[];

  @BeforeInsert()
  public updateApi() {
    this.apiKey = apiToken(24);
    this.role = this.role || 3;
  }
}
