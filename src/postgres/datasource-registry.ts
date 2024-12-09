import { EllipsiesBaseModel } from "../http/query-types";
import {
  DataSource,
  EntityMetadata,
  EntityTarget,
} from "@similie/pg-microservice-datasource";
export class DataSourceRegistry {
  private static instance: DataSourceRegistry;
  private _dataSource: DataSource | null = null;
  private constructor() {}

  public get register(): DataSource {
    if (!this.dataSource) {
      throw new Error("Data source not registered");
    }
    return this.dataSource;
  }

  public get dataSource() {
    if (!this._dataSource) {
      throw new Error("Data source not registered");
    }
    return this._dataSource;
  }

  public set register(dataSource: DataSource) {
    this._dataSource = dataSource;
  }

  public getEntityTargetByName(entityName: string) {
    return this.dataSource.entityMetadatas.find(
      (metadata: EntityMetadata) => metadata.name === entityName,
    );
  }
  public getRepositoryByName(entityName: string) {
    const entityMetadata = this.getEntityTargetByName(entityName);
    if (!entityMetadata) {
      throw new Error(`Entity ${entityName} not found`);
    }
    return this.dataSource.getRepository(entityMetadata.target);
  }

  public repository(entity: EntityTarget<EllipsiesBaseModel>) {
    return this.dataSource.getRepository(entity);
  }

  public meta(entity: EntityTarget<EllipsiesBaseModel>) {
    return this.dataSource.getMetadata(entity);
  }

  public static getInstance() {
    if (!DataSourceRegistry.instance) {
      DataSourceRegistry.instance = new DataSourceRegistry();
    }
    return DataSourceRegistry.instance;
  }
}
