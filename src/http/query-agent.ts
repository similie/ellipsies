/* eslint-disable @typescript-eslint/no-explicit-any */

import { Service, Container } from "typedi";
import { validate } from "class-validator";
import {
  ExpressRequest,
  ExpressResponse,
  IModelValues,
  RequestQuery,
  IDValue,
  RequestQueryParams,
} from "./index";

import {
  IAvgType,
  IModelAttributes,
  IModelSeekValues,
  getId,
} from "@similie/model-connect-entities";

import { Readable } from "stream";
import {
  toCamelCase,
  deepCloneObject,
} from "@similie/shared-microservice-utils";

import {
  PostgresHostManager,
  DataSourceRegistry,
  DataSource,
  PickKeysByType,
  Between,
  DeepPartial,
  EntityMetadata,
  EntityTarget,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsWhere,
  ILike,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  SelectQueryBuilder,
  ColumnMetadata,
  RelationMetadata,
  QueryDeepPartialEntity,
  FindOperator,
  Or,
} from "../postgres";

export { IAvgType, IModelAttributes, IModelSeekValues, getId };

@Service({ transient: true })
export class QueryAgent<t extends IModelValues> {
  public query: RequestQuery<t>;
  private manager: PostgresHostManager;
  /**
   * @static
   * @name getMeta
   * @description gets the meta data for a given target
   * @param {EntityTarget<IModelValues>} target
   * @returns {EntityMetadata}
   */
  public static getMeta(target: EntityTarget<IModelValues>) {
    return DataSourceRegistry.getInstance().meta(target);
  }
  /**
   * @static
   * @name validateQuery
   * @description validates and formats the query
   *  for a GET request
   * @param {ExpressRequest} req
   * @returns {Promise<IModelValues>}
   */
  public static async validateQuery<t extends IModelValues>(
    req: ExpressRequest,
  ): Promise<RequestQuery<t>> {
    const query = req.query;
    if (!Object.keys(query).length) {
      return query;
    }
    const params = new RequestQueryParams<t>(query);
    const values = await validate(params);
    if (values.length) {
      throw new Error("Invalid Query Parameters");
    }
    return params.toObject();
  }
  private readonly _defaultLimit = process.env["MAX_QUERY_LIMIT"]
    ? +process.env["MAX_QUERY_LIMIT"]
    : 1000;
  private target: EntityTarget<t>;
  /**
   * @constructor
   * @param {EntityTarget<IModelValues>} target
   * @param {RequestQuery<IModelValues>} query
   */
  public constructor(target: EntityTarget<t>, query: RequestQuery<t> = {}) {
    this.target = target;
    this.query = query;
    this.manager = Container.get(PostgresHostManager);
  }
  /**
   * @name checkObjectKeys
   * @description checks the keys for apply a specific request
   * @param {any} value
   * @param {string} key
   * @returns {any}
   */
  private checkObjectKeys(value: any, key: string): FindOperator<any> | any {
    if (key === "contains" && typeof value === "string") {
      return ILike(`%${value}%`);
    } else if (key === "startsWith" && typeof value === "string") {
      return ILike(`%${value}`);
    } else if (key === "endsWith" && typeof value === "string") {
      return ILike(`%${value}`);
    } else if (key === ">") {
      return MoreThan(value);
    } else if (key === ">=") {
      return MoreThanOrEqual(value);
    } else if (key === "<") {
      return LessThan(value);
    } else if (key === "<=") {
      return LessThanOrEqual(value);
    } else if (key === "between") {
      const from = Array.isArray(value) ? value[0] : value.from;
      const to = Array.isArray(value) ? value[1] : value.to;
      return Between(from, to);
    } else if (key === "or" && Array.isArray(value)) {
      const inQ: FindOperator<any>[] = [];
      for (const val of value) {
        const keys = val ? Object.keys(val) : [];
        for (const k of keys) {
          inQ.push(this.checkObjectKeys(val[k], k as string));
        }
      }

      return Or(...inQ);
    }
    return value;
  }
  /**
   * @name iterateObject
   * @description iterates the values of an object
   *  and apply any special attributes to the query
   * @param {any} value
   * @returns {any}
   */
  private iterateObject(value: any) {
    const send = [];
    for (const key in value) {
      if (!key) {
        continue;
      }
      send.push(this.checkObjectKeys(value[key], key));
    }
    return send.length === 1 ? send.pop() : send;
  }
  /**
   * @name isArrayTypeThatIsString
   * @description checks to see if a column type is array
   *   because that's returned as a string
   * @param {IModelValues} entity
   * @param {ColumnMetadata} column
   * @returns {boolean}
   */
  private isArrayTypeThatIsString(entity: t, column: ColumnMetadata) {
    return (
      column.isArray &&
      typeof entity[column.propertyName as keyof t] === "string" &&
      (column.type === "text" || column.type === "string")
    );
  }
  /**
   * @name alterEntityColumn
   * @description allows us to alter model columns before they
   * are sent to the user
   * @param {IModelValues} entity
   * @param {ColumnMetadata} column
   * @returns {void}
   */
  private alterEntityColumn(entity: t, column: ColumnMetadata) {
    if (this.isArrayTypeThatIsString(entity, column)) {
      entity[column.propertyName as keyof t] = JSON.parse(
        entity[column.propertyName as keyof t] as any,
      );
    }
    // @todo, any toJson outputs
  }
  /**
   * @name alterEntity
   * @description cycles through the attributes to
   * ensure they are formatted correctly
   * @param {IModelValues} entity
   * @param {ColumnMetadata[]} columns
   * @returns {void}
   */
  private alterEntity(entity: t, columns: ColumnMetadata[]) {
    columns.forEach((column: ColumnMetadata) => {
      try {
        this.alterEntityColumn(entity, column);
      } catch {
        // noop
      }
    });
  }
  /**
   * @name transformOutputParams
   * @description pulls the attribute meta to
   * apply any formatting for the end user
   * @param {IModelValues | IModelValues[] | null} entity
   * @returns {IModelValues}
   */
  private transformOutputParams(entity: t | t[] | null) {
    if (!entity) {
      return null;
    }
    const meta = this.dataSource.getMetadata(this.target);
    if (Array.isArray(entity)) {
      entity.forEach((ent: t) => this.alterEntity(ent, meta.columns));
    } else {
      this.alterEntity(entity, meta.columns);
    }
    return entity;
  }
  /**
   * @name iterateMetaRelations
   * @description iterates all the relations an calls back
   * when a relation is found
   * @param {function(RelationMetadata):boolean} cb
   * @returns {void}
   */
  private iterateMetaRelations(cb: (rel: RelationMetadata) => boolean) {
    const meta = this.dataSource.getMetadata(this.target);
    const relations = meta.relations;
    if (!relations || !relations.length) {
      return undefined;
    }

    for (const relation of relations) {
      if (cb(relation)) {
        break;
      }
    }
  }
  /**
   * @name hasPopulateValue
   * @description does the attribute have a relation
   * @param {string} attrName
   * @returns {boolean}
   */
  private hasPopulateValue(attrName: string) {
    let hasValue = false;
    this.iterateMetaRelations((rel: RelationMetadata) => {
      hasValue = rel.propertyName === attrName;
      return hasValue;
    });
    return hasValue;
  }
  /**
   * @name getAllPopulants
   * @description finds all the columns that have
   * relations
   * @returns {FindOptionsRelations<IModelValues>}
   */
  private getAllPopulants(): FindOptionsRelations<t> {
    const relation: Record<string, boolean> = {};
    this.iterateMetaRelations((rel: RelationMetadata) => {
      relation[rel.propertyName as string] = true;
      return false;
    });
    return relation as FindOptionsRelations<t>;
  }
  /**
   * @name hasAllPopulantValues
   * @description do we want to just populate all values
   * @returns {boolean}
   */
  private hasAllPopulantValues() {
    if (!Array.isArray(this.query.populate)) {
      return false;
    }
    return this.query.populate.indexOf("*") !== -1;
  }
  /**
   * @get populate
   * @returns {FindOptionsRelations<IModelValues>}
   */
  private get populate(): FindOptionsRelations<t> | undefined {
    if (!this.query.populate || !this.query.populate.length) {
      return undefined;
    }

    if (this.hasAllPopulantValues()) {
      return this.getAllPopulants();
    }
    const values: Record<string, boolean> = {};
    for (const pop of this.query.populate as (keyof typeof values)[]) {
      if (!this.hasPopulateValue(pop as string)) {
        continue;
      }
      values[pop] = true;
    }
    return values as FindOptionsRelations<t>;
  }

  /**
   * @name stripAssociations
   * @description removes or formats associations
   * @param {QueryDeepPartialEntity<IModelValues>} values
   * @returns {QueryDeepPartialEntity<IModelValues>}
   */
  private stripAssociations(
    values: QueryDeepPartialEntity<t>,
  ): QueryDeepPartialEntity<IModelValues> {
    const clone = deepCloneObject<Record<string, any>>(values);
    this.iterateMetaRelations((rel: RelationMetadata) => {
      if (
        !clone[rel.propertyName] ||
        (Array.isArray(clone[rel.propertyName]) &&
          !clone[rel.propertyName].length)
      ) {
        return false;
      }
      clone[rel.propertyName] = Array.isArray(clone[rel.propertyName])
        ? clone[rel.propertyName].map(getId)
        : getId(clone[rel.propertyName]);
      return false;
    });
    return clone as QueryDeepPartialEntity<t>;
  }
  /**
   * @name relationType
   * @description is the relationship to of interest
   * @param {RelationMetadata} relation
   * @returns {boolean}
   */
  private relationType(relation: RelationMetadata) {
    if (!relation) {
      return null;
    }
    const relationType = relation.relationType;
    return relationType === "one-to-many" || relationType === "many-to-many";
  }
  /**
   * @name relationName
   * @description pulls the name of the column in the associated table
   * @param {RelationMetadata} relation
   * @returns {string}
   */
  private relationName(relation: RelationMetadata) {
    const inverseEntityMetadata = relation.inverseEntityMetadata;
    return inverseEntityMetadata.tableName;
  }
  /**
   * @name setRelationMeta
   * @description sets the relationship details for
   * a relationship type attribute
   * @param {IModelAttributes} meta
   * @param {string} col
   * @param {Record<string, RelationMetadata>} relations
   * @returns {void}
   */
  private setRelationMeta(
    meta: IModelAttributes,
    col: string,
    relations: Record<string, RelationMetadata>,
  ) {
    const isRelation = !!relations[col];
    if (!isRelation) {
      return;
    }
    const rel = relations[col];
    const relationName = this.relationName(rel);
    const isCollection = this.relationType(rel);
    if (isCollection) {
      meta.collection = relationName;
    } else {
      meta.model = relationName;
    }
  }
  /**
   * @name appendCollections
   * @description after the attributes are pulled, we look for the
   * collections
   * @param { Record<string, RelationMetadata>} relations
   * @param {Record<string, boolean>} checked
   * @returns {Record<string, IModelAttributes>}
   */
  private appendCollections(
    relations: Record<string, RelationMetadata>,
    checked: Record<string, boolean>,
  ) {
    const attrs: Record<string, IModelAttributes> = {};
    for (const rel in relations) {
      const relation = relations[rel];
      if (checked[relation.propertyName]) {
        continue;
      }
      const meta: IModelAttributes = {
        type: "number",
        array: true,
        name: relation.propertyName,
      };
      this.setRelationMeta(meta, relation.propertyName, relations);
      attrs[relation.propertyName] = meta;
    }
    return attrs;
  }
  /**
   * @name compareChanges
   * @description sends the difference in the IModelAttributes
   * @param {QueryDeepPartialEntity<IModelAttributes>} values
   * @param {IModelAttributes} compare
   * @returns {QueryDeepPartialEntity<IModelAttributes>}
   */
  private compareChanges(values: QueryDeepPartialEntity<t>, compare: t) {
    const result: QueryDeepPartialEntity<t> = {};
    const stripped = this.stripAssociations(values);
    const comparator = this.stripAssociations(
      compare as QueryDeepPartialEntity<t>,
    );
    for (const k in stripped) {
      // Check if both objects contain the key'
      const key = k as keyof typeof stripped;
      if (
        !Object.prototype.hasOwnProperty.call(stripped, key) ||
        !Object.prototype.hasOwnProperty.call(comparator, key)
      ) {
        // Check if the values are different
        continue;
      }
      if (stripped[key] !== comparator[key]) {
        // Assign the new value from obj2 to the result
        result[k as keyof typeof result] = stripped[key] as any;
      }
    }

    return result;
  }
  /**
   * @name findRelationMeta
   * @description looks for the relationship data for the property
   * @param {string} entityName
   * @returns {null | RelationMetadata}
   */
  private findRelationMeta(entityName: string) {
    let meta = null;
    this.iterateMetaRelations((rel: RelationMetadata) => {
      if (rel.propertyName !== entityName) {
        return false;
      }
      meta = rel;
      return true;
    });
    return meta as null | RelationMetadata;
  }
  /**
   * @name getEntityTargetByName
   * @description finds the metadata for an entity by its name
   * @param {string} entityName
   * @returns {null | EntityMetadata}
   */
  private getEntityTargetByName(entityName: string) {
    return this.dataSource.entityMetadatas.find(
      (metadata: EntityMetadata) => metadata.name === entityName,
    );
  }
  /**
   * @name getRepositoryByName
   * @description gets the repository for a target by its name
   * @param {string} entityName
   * @returns { Repository<ObjectLiteral>}
   */
  private getRepositoryByName(entityName: string) {
    const entityMetadata = this.getEntityTargetByName(entityName);
    if (!entityMetadata) {
      throw new Error(`Entity ${entityName} not found`);
    }
    return this.dataSource.getRepository(entityMetadata.target);
  }

  private getRepositoryByRelation(relationName: string) {
    const relMeta = this.findRelationMeta(relationName);
    if (!relMeta) {
      throw new Error("Relation Metadata not found");
    }
    const childEntityMetadata = relMeta.inverseEntityMetadata;
    return this.getRepositoryByName(childEntityMetadata.targetName);
  }

  private async buildOneToManyCollection(
    id: number | null,
    value: number,
  ): Promise<t> {
    const popAttr = this.query.populate![0];
    const relMeta = this.findRelationMeta(popAttr);
    if (!relMeta) {
      throw new Error("Relation Metadata not found");
    }
    const inverseRelation = relMeta.inverseRelation;
    if (!inverseRelation) {
      throw new Error("No inverse relation found");
    }
    const repository = this.getRepositoryByRelation(popAttr);
    await repository.update(value, {
      [inverseRelation.propertyName]: id,
    });
    return repository.findOneBy({ id }) as Promise<t>;
  }

  private async populateAsArray(
    collection: any[],
    value: number,
    remove = false,
  ) {
    const id = getId(this.query.where);
    if (!id) {
      throw new Error("A query ID is required");
    }
    const popAttr = this.query.populate![0] as unknown as keyof t;
    if (remove) {
      collection = collection.filter((c: t | number) => getId(c) === +value);
    } else {
      collection.push(value);
    }
    await this.dataSource.getRepository<t>(this.target).update(id, {
      [popAttr]: collection,
    } as unknown as QueryDeepPartialEntity<t>);
    const repository = this.getRepositoryByRelation(popAttr as string);
    return repository.findOneBy({ id }) as Promise<t>;
  }

  private async getPopulationCollection() {
    const id = getId(this.query.where);
    const model = await this.findOneById(id);
    if (!model) {
      throw new Error("Model Not found");
    }
    const popAttr = this.query.populate![0] as unknown as keyof typeof model;
    const collection = model[popAttr] as any[];
    return collection.map(getId);
  }

  private populateAttr() {
    return this.query.populate![0] as unknown as keyof t;
  }

  private isOneToMany(popAttr: string) {
    const relMeta = this.findRelationMeta(popAttr);
    if (!relMeta) {
      return false;
    }
    const inverseRelation = relMeta.inverseRelation;
    return relMeta.isOneToMany && inverseRelation?.propertyName;
  }

  private applySortValues(queryBuilder: SelectQueryBuilder<t>, name: string) {
    const sort = this.sort || {};
    Object.keys(sort).forEach((key: string) => {
      const sortValue = sort[key as keyof typeof sort];
      queryBuilder.addOrderBy(
        `${name}.${key}`,
        sortValue ? (sortValue as "ASC" | "DESC") : "ASC",
      );
    });
  }

  private applyQueryElements(
    queryBuilder: SelectQueryBuilder<t>,
    name: string,
  ) {
    this.applySortValues(queryBuilder, name);
    if (this.skip) {
      queryBuilder.offset(this.skip);
    }

    if (this.limit) {
      queryBuilder.limit(this.limit);
    }

    const where = this.where;
    if (where) {
      queryBuilder.where(where);
    }
  }

  private async applyQueryBuilder() {
    const meta = this.dataSource.getRepository<t>(this.target).metadata;
    const name = meta.tableName;
    const queryBuilder = this.dataSource
      .getRepository<t>(this.target)
      .createQueryBuilder(name);

    this.applyQueryElements(queryBuilder, name);
    return { queryBuilder, name, meta };
  }

  private buildWhereContent(
    whereHold: FindOptionsWhere<t>[] = [],
    subQuery: FindOptionsWhere<t> | null = null,
  ): FindOptionsWhere<t>[] {
    const where = subQuery
      ? subQuery
      : this.query.where || ({} as FindOptionsWhere<t>);
    const sendWhere: FindOptionsWhere<t> = {};
    for (const k in where) {
      if (!k) {
        continue;
      }
      const key = k as keyof typeof where;

      if ((key as string) === "or") {
        (where[key] as any[]).forEach((value: FindOptionsWhere<t>) => {
          return this.buildWhereContent(whereHold, value);
        });
        continue;
      }
      const value = where[key];
      sendWhere[key] = this.applyWhere(value);
    }
    if (Object.keys(sendWhere).length) {
      whereHold.push(sendWhere);
    }
    return whereHold;
  }

  ////////////
  // Public //
  ////////////
  public get dataSource(): DataSource {
    return this.manager.datasource;
  }

  public get limit() {
    return this.query.limit || this._defaultLimit;
  }

  public get skip() {
    return this.query.skip || 0;
  }

  public applyWhere(value: any) {
    if (typeof value === "string") {
      return value;
    } else if (Array.isArray(value)) {
      return In(value);
    } else if (typeof value === "object") {
      return this.iterateObject(value);
    }
    return value;
  }

  public get where() {
    const where = this.buildWhereContent();
    if (!where.length) {
      return null;
    }
    return where;
  }

  public get sort(): FindOptionsOrder<t> {
    return this.query.sort as any; // this.query.sort || '';
  }

  public findOneBy(where: FindOptionsWhere<t>): Promise<t | null> {
    return this.dataSource
      .getRepository<t>(this.target)
      .findOne({
        where,
        relations: this.populate,
      })
      .then((values: t | null) => {
        return this.transformOutputParams(values) as t | null;
      });
  }

  public findOneById(id: any): Promise<t | null> {
    return this.dataSource
      .getRepository<t>(this.target)
      .findOne({ where: { id }, relations: this.populate } as any)
      .then((values: t | null) => {
        return this.transformOutputParams(values) as t | null;
      });
  }

  public async getObjects() {
    return this.dataSource
      .getRepository<t>(this.target)
      .find({
        skip: this.skip,
        take: this.limit,
        where: this.where as FindOptionsWhere<t>[],
        order: this.sort,
        relations: this.populate,
      })
      .then(this.transformOutputParams.bind(this));
  }

  public async create(content: DeepPartial<t | t[]>) {
    const object = await this.dataSource
      .getRepository<t | t[]>(this.target)
      .save(
        this.dataSource.getRepository<t | t[]>(this.target).create(content),
      );
    this.query.populate = ["*"];
    if (Array.isArray(object)) {
      this.query.where = {
        id: object.map((o: t) => o.id as any),
      };
      return this.getObjects();
    }
    if (!object) {
      throw new Error("Object failed to create");
    }
    return this.findOneById((object as t).id as IDValue);
  }

  public async updateById(
    values: QueryDeepPartialEntity<t>,
  ): Promise<t | null> {
    const id = this.query.where!.id;
    if (!id) {
      throw new Error("A query ID is required");
    }
    const compare = await this.findOneById(id as IDValue);
    if (!compare) {
      throw new Error("Object not found");
    }
    const stripped = this.compareChanges(values, compare);
    if (!Object.keys(stripped).length) {
      throw new Error("No changes to update");
    }
    await this.dataSource
      .getRepository<t>(this.target)
      .update(id as IDValue, stripped);
    this.query.populate = ["*"];
    return this.findOneById(id as number);
  }

  public async updateByQuery(values: QueryDeepPartialEntity<t>): Promise<t[]> {
    const objects = ((await this.getObjects()) as t[]) || [];
    const ids = objects.map(getId);
    this.query.where = {
      id: ids,
    } as FindOptionsWhere<t>;
    await this.dataSource
      .getRepository<t>(this.target)
      .update(this.where![0], values);
    this.query.populate = ["*"];
    return this.getObjects() as Promise<t[]>;
  }

  public async destroyById(): Promise<t | null> {
    const id = this.query.where!.id;
    if (!id) {
      throw new Error("A query ID is required");
    }
    this.query.populate = ["*"];
    const send = await this.findOneById(id as IDValue);
    await this.dataSource.getRepository<t>(this.target).delete(id as IDValue);
    return send;
  }

  public async destroyAll(): Promise<t[]> {
    const objects = ((await this.getObjects()) as t[]) || [];
    const ids = objects.map(getId);
    for (const id of ids) {
      await this.dataSource.getRepository<t>(this.target).delete(id as IDValue);
    }
    return objects;
  }

  public attr(): Record<string, IModelAttributes> {
    const relations: Record<string, RelationMetadata> = {};
    const checked: Record<string, boolean> = {};
    this.iterateMetaRelations((rel: RelationMetadata) => {
      relations[rel.propertyName] = rel;
      return false;
    });
    const attrs: Record<string, IModelAttributes> = {};
    const meta = this.dataSource.getMetadata(this.target);
    for (const col of meta.columns) {
      checked[col.propertyName] = true;
      const meta: IModelAttributes = {
        type: col.type as any,
        array: col.isArray,
        name: col.propertyName,
      };
      this.setRelationMeta(meta, col.propertyName, relations);
      attrs[col.propertyName] = meta;
    }
    Object.assign(attrs, this.appendCollections(relations, checked));
    return attrs;
  }

  public async sum(attr: string) {
    const sum = await this.dataSource
      .getRepository<t>(this.target)
      .sum(
        attr as PickKeysByType<t, number>,
        this.where as FindOptionsWhere<t>[],
      );
    return { sum };
  }

  public async avg(attr: string): Promise<IAvgType> {
    const avg = await this.dataSource
      .getRepository<t>(this.target)
      .average(
        attr as PickKeysByType<t, number>,
        this.where as FindOptionsWhere<t>[],
      );
    return { avg };
  }

  public async addToCollection(value: number): Promise<t | null> {
    const popAttr = this.populateAttr();
    const collectionAsId = await this.getPopulationCollection();
    if (collectionAsId.indexOf(+value) !== -1) {
      return null;
    }
    if (this.isOneToMany(popAttr as string)) {
      const id = getId(this.query.where);
      return this.buildOneToManyCollection(id, value);
    }
    return this.populateAsArray(collectionAsId, value);
  }

  public async removeFromCollection(value: number): Promise<t | null> {
    const popAttr = this.populateAttr();
    const collectionAsId = await this.getPopulationCollection();
    if (collectionAsId.indexOf(+value) === -1) {
      return null;
    }
    if (this.isOneToMany(popAttr as string)) {
      return this.buildOneToManyCollection(null, value);
    }
    return this.populateAsArray(collectionAsId, value, true);
  }

  private convertRawQueryValueToEntity(rawData: any, name: string) {
    const keys = Object.keys(rawData as unknown as t);
    const entityValue: Record<string, any> = {};
    for (const key of keys) {
      const alteredKey = key.replace(name + "_", "");
      entityValue[toCamelCase(alteredKey)] = rawData[key];
    }
    return this.dataSource
      .getRepository<t>(this.target)
      .create(entityValue as unknown as t);
  }

  public async streamQuery() {
    const builder = await this.applyQueryBuilder();
    const readable = new Readable({
      read() {},
    });
    const queryStream = await builder.queryBuilder.stream();
    queryStream.on("data", (chunk: any) => {
      const entity = this.convertRawQueryValueToEntity(chunk, builder.name);
      readable.push(JSON.stringify(entity) + "\n");
    });
    queryStream.on("end", () => {
      readable.push(null); // Signal end of stream
    });
    return readable;
  }

  public setStreamHeaders(res: ExpressResponse) {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
      Connection: "keep-alive",
    });
  }

  private async processStreamBatch(limiter: number, readable: Readable) {
    const count = await this.count();
    let collectedCount = 0;
    this.query.limit = limiter;
    while (collectedCount < count) {
      this.query.skip = collectedCount;
      const values = (await this.getObjects()) as t[];
      if (!values || !values.length) {
        break;
      }
      collectedCount += values.length;
      readable.push(JSON.stringify(values) + "\n");
    }
    readable.push(null);
  }

  public streamBatch(limiter: number = 10) {
    const readable = new Readable({
      read() {},
    });
    this.processStreamBatch(limiter, readable);
    return readable;
  }

  public count() {
    return this.dataSource
      .getRepository<t>(this.target)
      .count({ where: this.where as FindOptionsWhere<t>[] });
  }

  public async seek(body: IModelSeekValues<t>): Promise<t> {
    const found = await this.dataSource
      .getRepository<t>(this.target)
      .findOneBy(body.criteria as FindOptionsWhere<t>);
    if (found) {
      return found;
    }
    return this.create(body.initialValues) as Promise<t>;
  }
}
