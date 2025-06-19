/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
/* eslint-disable object-curly-spacing */
import { InternalServerError } from "routing-controllers";
import { LogProfile } from "@similie/shared-microservice-utils";
import {
  IModelController,
  IModelValues,
  QueryAgent,
  RequestQueryParams,
  populateType,
  ExpressRequest,
  ExpressResponse,
} from "./index";

import {
  DeepPartial,
  EntityMetadata,
  EntityTarget,
  FindOptionsWhere,
} from "../postgres";

import {
  IModelSeekValues,
  IModelUpdateValues,
  UUID,
} from "@similie/model-connect-entities";
const UUID_ENUM =
  "\\d+|[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}";
export enum ControllerRoutes {
  ROOT = "/",
  ID = `/:id(\\d+|[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})`,
  SCHEMA = "/schema",
  SUM = "/sum/:attr",
  AVG = "/avg/:attr",
  COUNT = "/count",
  POPULATE = `/:id(\\d+|[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})/:attr/:value(\\d+|[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})`,
  STREAM = "/stream",
  STREAM_BATCH = "/stream-batch/:limiter",
  SEEK = "/seek",
}

export enum ControllerFunctionNames {
  FIND = "find",
  FIND_ONE = "findOne",
  CREATE = "create",
  UPDATE = "update",
  UPDATE_ONE = "updateOne",
  DESTROY = "destroy",
  DESTROY_ONE = "destroyOne",
  SUM = "sum",
  AVG = "avg",
  POPULATE = "populate",
  DEPOPULATE = "depopulate",
  STREAM = "stream",
  STREAM_BATCH = "streamBatch",
  COUNT = "count",
  SEEK = "seek",
  SCHEMA = "attr",
  ALL = "*",
}

/**
 * @abstract
 * @name EllipsiesController
 * @description an abstract class for handling generic model actions
 */
export abstract class EllipsiesController<t extends IModelValues>
  implements IModelController<t>
{
  private logger: LogProfile;
  private meta: EntityMetadata;
  public constructor(private _target: EntityTarget<t>) {
    this.applyAttributes();
  }
  /**
   * @name applyAttributes
   * @returns {void}
   */
  private applyAttributes() {
    this.meta = QueryAgent.getMeta(this.target);
    this.logger = new LogProfile(`${this.meta.name}Controller`);
  }
  /**
   * @get target
   * @returns {EntityTarget<t>}
   */
  public get target() {
    return this._target;
  }
  /**
   * @set target
   * @param {EntityTarget<t>} target
   */
  public set target(target: EntityTarget<t>) {
    this._target = target;
    this.applyAttributes();
  }
  /**
   * @name find
   * @description finds the objects based on query attributes
   * @param {ExpressRequest} req
   * @returns {Promise<IModelValues[]>}
   */
  public async find(req: ExpressRequest): Promise<t[]> {
    try {
      const query = await QueryAgent.validateQuery<t>(req);
      const agent = new QueryAgent<t>(this.target, query);
      return agent.getObjects() as Promise<t[]>;
    } catch (error: any) {
      this.logger.log.error("Find Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name findOne
   * @description finds on object based on the id
   * @param {number} id
   * @param {populateType} populate
   * @returns {Promise<IModelValues | null>}
   */
  public async findOne(
    id: number | UUID,
    populate: populateType = {},
  ): Promise<t | null> {
    try {
      const params = new RequestQueryParams<t>({ populate });
      const agent = new QueryAgent<t>(this.target, params.toObject());
      return agent.findOneById(id) as Promise<t | null>;
    } catch (error: any) {
      this.logger.log.error("FindOne Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name create
   * @description creates one or many objects of the given type
   * @param {DeepPartial<IModelValues | IModelValues[]>} body
   * @returns {Promise<IModelValues | IModelValues[]>}
   */
  public async create(body: DeepPartial<t | t[]>): Promise<t | t[]> {
    try {
      const agent = new QueryAgent<t>(this.target, {});
      return agent.create(body) as Promise<t | t[]>;
    } catch (error: any) {
      this.logger.log.error("Create Error", error.message);
      throw new InternalServerError(error.message);
    }
  }

  /**
   * @name update
   * @description updates on or many object targets
   * @param {IModelUpdateValues<IModelValues>} body
   * @returns {Promise<IModelValues | IModelValues[]>}
   */
  public async update(body: IModelUpdateValues<t>): Promise<t | t[]> {
    try {
      const agent = new QueryAgent<t>(this.target, {
        where: body.query as FindOptionsWhere<t>,
      });
      return agent.updateByQuery(body.update);
    } catch (error: any) {
      this.logger.log.error("Update Error", error.message);
      throw new InternalServerError(error.message);
    }
  }

  /**
   * @name updateOne
   * @description updates one record based on the id
   * @param {number} id
   * @param {Partial<IModelValues>} body
   * @returns {Promise<IModelValues>}
   */
  public async updateOne(id: number, body: Partial<t>): Promise<t | null> {
    try {
      const agent = new QueryAgent<t>(this.target, { where: { id } });
      return agent.updateById(body as any);
    } catch (error: any) {
      this.logger.log.error("UpdateOne Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name destroy
   * @description destroys all the targets for a given query
   * @param {FindOptionsWhere<IModelValues>} body
   * @returns {Promise<IModelValues | IModelValues[]>}
   */
  public async destroy(body: FindOptionsWhere<t>): Promise<t | t[]> {
    try {
      const agent = new QueryAgent<t>(this.target, { where: body });
      return agent.destroyAll();
    } catch (error: any) {
      this.logger.log.error("Destroy Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name destroyOne
   * @description destroys one object based on it's id
   * @param {number} id
   * @returns {Promise<IModelValues | null>}
   */
  public async destroyOne(id: number): Promise<t | null> {
    try {
      const agent = new QueryAgent<t>(this.target, { where: { id } });
      return agent.destroyById() as Promise<t | null>;
    } catch (error: any) {
      this.logger.log.error("DestroyOne Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name attr
   * @description pulls the attributes for a model
   * @returns {Promise<Record<string, IModelAttributes>>}
   */
  public async attr() {
    try {
      const agent = new QueryAgent<t>(this.target, {});
      return agent.attr();
    } catch (error: any) {
      this.logger.log.error("Attr Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name sum
   * @description sums the values of a given attributes and query
   * @param {string} attr
   * @param {ExpressRequest} req
   * @returns {Promise<number>}
   */
  public async sum(attr: string, req: ExpressRequest) {
    try {
      const query = await QueryAgent.validateQuery<t>(req);
      const agent = new QueryAgent<t>(this.target, query);
      return agent.sum(attr);
    } catch (error: any) {
      this.logger.log.error("SUM Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name avg
   * @description averages the values of a given attributes and query
   * @param {string} attr
   * @param {ExpressRequest} req
   * @returns {Promise<number>}
   */
  public async avg(attr: string, req: ExpressRequest) {
    try {
      const query = await QueryAgent.validateQuery<t>(req);
      const agent = new QueryAgent<t>(this.target, query);
      return agent.avg(attr);
    } catch (error: any) {
      this.logger.log.error("AVG Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name populate
   * @description populates the value id to a collection for the identity target
   * @param {number} identity
   * @param {number} value
   * @param {string} attr
   * @returns {Promise<void>}
   */
  public populate(identity: number, value: number, attr: string) {
    try {
      const agent = new QueryAgent<t>(this.target, {
        where: { id: identity },
        populate: [attr],
      });
      return agent.addToCollection(value) as Promise<t | null>;
    } catch (error: any) {
      this.logger.log.error("Populate Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name depopulate
   * @description removes the value id to a collection for the identity target
   * @param {number} identity
   * @param {number} value
   * @param {string} attr
   * @returns {Promise<void>}
   */
  public async depopulate(identity: number, value: number, attr: string) {
    try {
      const agent = new QueryAgent<t>(this.target, {
        where: { id: identity },
        populate: [attr],
      });
      return agent.removeFromCollection(value) as Promise<t | null>;
    } catch (error: any) {
      this.logger.log.error("Depopulate Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name stream
   * @description streams models to the end user
   * @param {ExpressRequest} req
   * @param {ExpressResponse} res
   * @returns {Promise<ExpressResponse>}
   */
  public async stream(req: ExpressRequest, res: ExpressResponse) {
    try {
      const query = await QueryAgent.validateQuery<t>(req);
      const agent = new QueryAgent<t>(this.target, query);
      agent.setStreamHeaders(res);
      const stream = await agent.streamQuery();
      stream.pipe(res);
    } catch (e: any) {
      this.logger.log.error("Stream Error", e.message);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
    return res;
  }
  /**
   * @name streamBatch
   * @description streams models in chunks based on the limiter to the end user
   * @param {number} limiter
   * @param {ExpressRequest} req
   * @param {ExpressResponse} res
   * @returns {Promise<ExpressResponse>}
   */
  public async streamBatch(
    limiter: number,
    req: ExpressRequest,
    res: ExpressResponse,
  ) {
    try {
      const query = await QueryAgent.validateQuery<t>(req);
      const agent = new QueryAgent<t>(this.target, query);
      agent.setStreamHeaders(res);
      agent.streamBatch(limiter).pipe(res);
    } catch (e: any) {
      this.logger.log.error("Stream Error", e.message);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
    return res;
  }
  /**
   * @name count
   * @description counts the objects for a given query
   * @param {ExpressRequest} req
   * @returns {Promise<number>}
   */
  public async count(req: ExpressRequest) {
    try {
      const query = await QueryAgent.validateQuery<t>(req);
      const agent = new QueryAgent<t>(this.target, query);
      return agent.count();
    } catch (error: any) {
      this.logger.log.error("Count Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
  /**
   * @name seek
   * @description finds or creates a model.
   * @param {IModelSeekValues<IModelValues>} body
   * @returns {Promise<IModelValues>}
   */
  public async seek(body: IModelSeekValues<t>) {
    try {
      const agent = new QueryAgent<t>(this.target, {});
      return agent.seek(body);
    } catch (error: any) {
      this.logger.log.error("Count Error", error.message);
      throw new InternalServerError(error.message);
    }
  }
}
