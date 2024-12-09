import { NextFunction, Request, Response } from 'express';

// export namespace SimilieHTTP {
export interface ExpressRequest extends Request {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
}
export interface ExpressResponse extends Response {}

export interface ExpressNext extends NextFunction {}

export type ExpressMiddlewareType = (
  res: ExpressRequest,
  req: ExpressResponse,
  next: ExpressNext
) => Promise<void> | void;
