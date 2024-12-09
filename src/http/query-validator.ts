/* eslint-disable indent */
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';
import {
  IFindWhere,
  RequestQuery,
  RequestQueryRaw,
  EllipsiesBaseModel,
} from './query-types';

export class RequestQueryParams<t extends Partial<EllipsiesBaseModel>>
  implements RequestQuery<t>
{
  @IsInt()
  @IsOptional()
  @Min(0)
  public limit?: number;
  @IsInt()
  @IsOptional()
  @Min(0)
  public skip?: number;
  @IsOptional()
  @IsObject()
  public where?: IFindWhere<t>;
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public sort?: any;
  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public populate?: string[] | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(args: RequestQueryRaw<t>) {
    this.limit = this.parseNumber(args.limit);
    this.skip = this.parseNumber(args.skip);
    this.where = this.parseObjects(args.where);
    this.sort = this.parseObjects(args.sort);
    this.populate = this.parseObjects(args.populate);
  }

  private splitToken(objectStringValue: string) {
    return objectStringValue.includes(':')
      ? ':'
      : objectStringValue.includes('=')
      ? '='
      : ' ';
  }

  private parseObjects(objValue: string | object | undefined) {
    if (!objValue) {
      return undefined;
    }

    if (typeof objValue !== 'string') {
      return objValue;
    }

    const decoded = decodeURIComponent(objValue);

    try {
      const value = JSON.parse(decoded);
      return value;
    } catch {
      // noop
    }
    const stringValue = decoded || '';
    const split = stringValue.split(',');
    const splitToken = this.splitToken(stringValue);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: Record<string, any> = {}; // Add type annotation
    split.forEach((value: string) => {
      const [key, val] = value.split(splitToken);
      obj[key || ''] = val;
    });

    return obj;
  }

  private parseNumber(value: number | string | undefined) {
    return typeof value === 'string' ? +value : value;
  }

  private removeUndefined() {
    const obj = Object.assign({}, this);
    for (const key in obj) {
      if (
        Object.prototype.hasOwnProperty.call(obj, key) &&
        obj[key] === undefined
      ) {
        delete obj[key];
      }
    }
    return obj;
  }

  public toObject(): RequestQuery<t> {
    return this.removeUndefined();
  }
}
