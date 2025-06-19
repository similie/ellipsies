import "reflect-metadata";
import { Service } from "typedi";
import {
  DataSourceCredentials,
  Entities,
  IDataSourceCredentials,
  OverrideOptions,
  DataSource,
  EntityManager,
  BaseEntity,
  EntityTarget,
} from "@similie/pg-microservice-datasource";
import { LogProfile } from "@similie/shared-microservice-utils";
import { DataSourceRegistry } from "./datasource-registry";

// @Service()
export class ActivePgDataSource {
  private _credentials: DataSourceCredentials | undefined;
  private _dataSource: DataSource | undefined;
  /**
   * Creates a postgres db connection options set with the pre-built Similie
   * config and optional 'forTest' param.'
   * @param {Entities} entities built with 'buildCommonConfig'
   * @param {IDataSourceCredentials} config specify true for the test config, defaults to false
   * @param {OverrideOptions} optionsOverride specify true for the test config, defaults to false
   * @returns {PostgresConnectionOptions} for connecting to a live or test db
   */
  public async create(
    entities: Entities,
    config: IDataSourceCredentials,
    optionsOverride: OverrideOptions = {},
  ) {
    this._credentials = new DataSourceCredentials(entities, config);
    const options = {
      ...this._credentials.credentials,
      ...optionsOverride,
    };
    this._dataSource = new DataSource(options);
  }

  public get credentials() {
    return this._credentials;
  }

  public get dataSource() {
    return this._dataSource;
  }

  public async destroy() {
    if (!this._dataSource) {
      return;
    }
    await this._dataSource.destroy();
    this._dataSource = undefined;
  }
}

/**
 * Postgres host manager
 */
@Service()
export class PostgresHostManager {
  // private _dataSource: DataSource | undefined;
  private _logger: LogProfile;
  private _globalConfig: ActivePgDataSource;

  public constructor(private _isForTest = false) {
    this._globalConfig = new ActivePgDataSource();
    this._logger = new LogProfile("PostgresHostManager");
  }

  public get globalConfig() {
    return this._globalConfig;
  }

  /**
   * @name init
   * @description allows us to override the default credentials. Throws an error if it is already initialized
   * @param {Entities} entities
   * @param {IDataSourceCredentials} credentials
   * @param {OverrideOptions?} options
   * @returns {Promise<void>}
   */
  public async init(
    entities: Entities,
    credentials: IDataSourceCredentials,
    options?: OverrideOptions,
  ) {
    await this.globalConfig.destroy();
    // this._globalConfig = Container.get(ActivePgDataSource);
    await this.globalConfig.create(entities, credentials, options);
    // this._dataSource = this.globalConfig.dataSource;
    if (this.globalConfig.dataSource) {
      DataSourceRegistry.getInstance().register = this.globalConfig.dataSource;
    }

    await this.initialize();
  }
  /**
   * @returns {LogProfile.log}
   */
  public get Logger(): LogProfile {
    return this._logger;
  }

  /**
   * Initialize datasource and open database connection
   * @returns {void}
   */

  public async initialize() {
    if (!this.globalConfig.dataSource) {
      throw new Error("Data Source not initialized");
    }
    if (this.globalConfig.dataSource.isInitialized) return;
    await this.globalConfig.dataSource.initialize();
    this.Logger.log.info(
      `${this._isForTest ? "Test" : ""} TypeORM Data Source initialized`,
    );
  }

  /** simple passthrough for DataSource.isInitialized */
  public get isInitialized() {
    if (!this.globalConfig.dataSource) {
      return false;
    }
    return this.globalConfig.dataSource.isInitialized;
  }

  /** Return the instance's TypeORM data source */
  public get datasource() {
    if (!this.globalConfig.dataSource) {
      throw new Error("Data Source not initialized");
    }
    return this.globalConfig.dataSource;
  }

  /** Return a new instance of a TypeORM entity manager */
  public get entityManager() {
    if (!this.globalConfig.dataSource) {
      throw new Error("Data Source not initialized");
    }
    return new EntityManager(this.globalConfig.dataSource);
  }

  /**
   * Gets a TypeORM repository for the named class
   * @param {EntityTarget<Entity>} forTarget Name of entity
   * @returns {EntityManager}
   */
  public getRepository<Entity extends BaseEntity>(
    forTarget: EntityTarget<Entity>,
  ) {
    return this.entityManager.getRepository(forTarget); // this.datasource.getRepository(forTarget); //this.entityManager.getRepository(forTarget);
  }

  /**
   * Close connections and destroy datasource
   * @returns {void}
   */
  public async destroy() {
    if (!this._globalConfig || !this.globalConfig.dataSource) {
      return;
    }
    await this.globalConfig.destroy();
  }
}
