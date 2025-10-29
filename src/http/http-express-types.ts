import { NextFunction, Request, Response } from "express";
export type ExpressRequest = Request & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
};
export type ExpressResponse = Response & { locals: any };

export type ExpressNext = NextFunction;

export type ExpressMiddlewareType = (
  res: ExpressRequest,
  req: ExpressResponse,
  next: ExpressNext,
) => Promise<void> | void;
