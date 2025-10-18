/* eslint-disable @typescript-eslint/ban-types */
import { Container } from "typedi";
import {
  ApplicationServer,
  CONTROLLER_SETUP_VALUE,
  INTERNAL_HTTP_PORT,
  APPLICATION_SERVER_NAME,
  INTERNAL_HTTP_PREFIX,
  ControllerSetup,
} from "./index";

import {
  Entities,
  IDataSourceCredentials,
  OverrideOptions,
} from "@similie/pg-microservice-datasource";
import { PostgresHostManager } from "../postgres";
export const DEFAULT_SERVICE_PORT = 1612;
export const COMMON_API_SERVICE_ROUTES = "/api/v2/";

export interface ServerConfig {
  port?: number;
  prefix?: string;
  controllers: Entities;
  models: Entities;
  middleware?: Function[] | string[];
  cors?: boolean | Record<string, string>;
}

export class Ellipsies {
  private _server: ApplicationServer;
  private _postgresManager: PostgresHostManager;
  public constructor(private config: ServerConfig) {
    const setup = new ControllerSetup(
      Ellipsies.toFunctions(this.config.controllers),
      this.config.middleware,
      this.config.cors,
      // this.config.controllers as unknown as Function[],
    );
    Container.set(INTERNAL_HTTP_PORT, this.config.port || DEFAULT_SERVICE_PORT);
    Container.set(INTERNAL_HTTP_PREFIX, this.config.prefix || "");
    Container.set(CONTROLLER_SETUP_VALUE, setup);
    Container.set(APPLICATION_SERVER_NAME, "EllipsiesApplicationServer");
    this._server = Container.get(ApplicationServer);
    this._postgresManager = Container.get(PostgresHostManager);
  }

  /**
   * @name setDataSource
   * @description sets the data sources for the application
   * @param {IDataSourceCredentials} db
   * @param {OverrideOptions?} options
   * @returns {Promise<void>}
   */
  public async setDataSource(
    db: IDataSourceCredentials,
    options?: OverrideOptions,
  ) {
    return this._postgresManager.init(this.config.models, db, options);
  }
  /**
   * @static
   * @name toFunctions
   * @param {Entities} enities
   * @returns {Function[]}
   */
  public static toFunctions(entities: { [key: string]: any }) {
    const keys = Object.keys(entities);
    return keys.map((k: string) => {
      const entity = entities[k];
      return entity && entity.default
        ? (entity.default as Function)
        : (entity as Function);
    });
  }

  public get server() {
    return this._server;
  }

  public async start() {
    return this.server.start();
  }
  /**
   * @name close
   *  @description closes the server
   * @returns {Promse<void>}
   */
  public async close() {
    return this.server.close();
  }
  /**
   * @name shutdown
   *  @description closes the server and database connection
   * @returns {Promse<void>}
   */
  public async shutdown() {
    this.server.close();
    await this.pgManager.destroy();
  }

  public get pgManager() {
    return this._postgresManager;
  }
}
