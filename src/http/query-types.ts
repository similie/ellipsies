import { HttpConnection } from "@similie/http-connector";
import {
  IAvgType,
  IModelAttributes,
  IModelSeekValues,
  IModelUpdateValues,
  ISumType as _ISumType,
  UUID as _UUID,
  IDValue as _IDValue,
  IEntity,
} from "@similie/model-connect-entities";

import { ExpressRequest, ExpressResponse } from "./index";
import {
  BaseEntity,
  FindOptionsWhere,
  FindOptionsOrder,
  DeepPartial,
} from "../postgres";
export type UUID = _UUID;
export type IDValue = _IDValue;
export { IModelAttributes, IModelSeekValues };

export type ISumType = _ISumType;

export type EllipsiesBaseModel = IEntity;

export interface IModelValues extends EllipsiesBaseModel, BaseEntity {}

export type populateType = Partial<BaseEntity>;

export type IFindWhere<t extends Partial<EllipsiesBaseModel>> =
  | FindOptionsWhere<t>
  | Partial<IModelValues>;

export interface RequestQueryRaw<t extends Partial<EllipsiesBaseModel>> {
  limit?: number;
  skip?: number;
  where?: IFindWhere<t>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  populate?: any;
  sort?: FindOptionsOrder<t>;
}

export interface RequestQuery<t extends Partial<EllipsiesBaseModel>>
  extends RequestQueryRaw<t> {
  populate?: string[] | string;
}

export interface IRawHttpQuery {
  url: string;
  http: HttpConnection;
}

export interface IModelController<t extends EllipsiesBaseModel> {
  find: (req: ExpressRequest) => Promise<t[]>;
  findOne: (id: number, populate: populateType) => Promise<t | null>;
  create: (body: DeepPartial<t | t[]>) => Promise<t | t[]>;
  update: (body: IModelUpdateValues<t>) => Promise<t | t[]>;
  updateOne: (id: number, body: Partial<t>) => Promise<t | null>;
  destroy: (body: FindOptionsWhere<t>) => Promise<t | t[]>;
  destroyOne: (id: number | UUID) => Promise<t | null>;
  attr: () => Promise<Record<string, IModelAttributes>>;
  sum: (attr: string, req: ExpressRequest) => Promise<ISumType>;
  avg: (attr: string, req: ExpressRequest) => Promise<IAvgType>;
  populate: (id: number, value: number, attr: string) => Promise<t | null>;
  depopulate: (id: number, value: number, attr: string) => Promise<t | null>;
  stream: (
    req: ExpressRequest,
    res: ExpressResponse,
  ) => Promise<ExpressResponse>;
  streamBatch: (
    limiter: number,
    req: ExpressRequest,
    res: ExpressResponse,
  ) => Promise<ExpressResponse>;
  count: (req: ExpressRequest) => Promise<number>;
  seek: (body: IModelSeekValues<t>) => Promise<t | null>;
}

export enum INTERNAL_SERVICE_PORTS {
  MANAGEMENT = 1613,
  TEST = 9999,
  SERVICE = 1612,
}
