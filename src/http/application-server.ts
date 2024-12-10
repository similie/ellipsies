/* eslint-disable indent */
/* eslint-disable @typescript-eslint/ban-types */
import {
  RoutingControllersOptions,
  createExpressServer,
  useContainer,
} from "routing-controllers";
import express from "express";
import { Container, Service } from "typedi";
import { LogProfile } from "@similie/shared-microservice-utils";

import { Server } from "http";
import { INTERNAL_SERVICE_PORTS } from "./query-types";

export const CONTROLLER_SETUP_VALUE = "CONTROLLER_SETUP_CONTENT_NAME";
export const INTERNAL_HTTP_PORT = "INTERNAL_HTTP_PORT_VALUE";
export const INTERNAL_HTTP_PREFIX = "INTERNAL_HTTP_PREFIX_VALUE";
export const INTERNAL_HTTP_SERVER_OPTIONS = "INTERNAL_HTTP_SERVER_OPTIONS";
export const APPLICATION_SERVER_NAME = "APPLICATION_SERVER_NAME";

export class ControllerSetup {
  private _serverControllers: Function[] | string[];
  private _serverMiddleware: Function[] | string[];

  public constructor(
    serverControllers: Function[] | string[],
    serverMiddleware?: Function[] | string[],
  ) {
    this._serverControllers = serverControllers || [];
    this._serverMiddleware = serverMiddleware || [];
  }

  public get controllers() {
    return this._serverControllers;
  }

  public get middleware(): Function[] | string[] {
    return this._serverMiddleware;
  }
}

@Service()
export class ApplicationServer {
  private _app: express.Application;
  private readonly port: number;
  private readonly prefix: string;
  private readonly _logger: LogProfile;
  private _server: Server | undefined;

  public constructor() {
    useContainer(Container);
    const setup = Container.get(CONTROLLER_SETUP_VALUE) as ControllerSetup;
    this.prefix = Container.get(INTERNAL_HTTP_PREFIX);
    const options = (
      Container.has(INTERNAL_HTTP_SERVER_OPTIONS)
        ? Container.get(INTERNAL_HTTP_SERVER_OPTIONS)
        : {}
    ) as RoutingControllersOptions;

    this._app = createExpressServer({
      // classTransformer: true,
      controllers: setup.controllers,
      cors: true,
      middlewares: setup.middleware,
      routePrefix: this.prefix,
      ...options,
    });

    // Apply URL-encoded parser as middleware
    this._app.use(express.urlencoded({ extended: true }));
    this._app.use(express.json()); // For JSON parsing
    this.port =
      Container.get(INTERNAL_HTTP_PORT) || INTERNAL_SERVICE_PORTS.MANAGEMENT;
    const loggerProfileName =
      (Container.get(APPLICATION_SERVER_NAME) as string) || "Application";
    this._logger = new LogProfile(loggerProfileName);
  }
  /**
   * @name routePrefix
   * @returns {string} - prefix without trailing slash
   */
  public get routerPrefix() {
    if (this.prefix.endsWith("/")) {
      return this.prefix.slice(0, -1);
    }
    return this.prefix;
  }

  /**
   * @name app
   * @returns {express.Application}
   */
  public get app() {
    return this._app;
  }

  /**
   * @name server
   * @returns {Server | undefined}
   */
  public get server() {
    return this._server;
  }

  /**
   * @name start
   * @description starts the express server
   * @returns {Promise<number>}
   */
  public start() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<number>((resolve: any) => {
      // this.setBodyParser();
      this._server = this.app.listen(this.port, () => {
        this._logger.log.info(
          `Routing API Started on ${this.port} at ${this.routerPrefix} `,
        );

        resolve(this.port);
      });
    });
  }

  public close() {
    return this._server?.close();
  }
}
