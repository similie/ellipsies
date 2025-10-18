/* eslint-disable indent */
/* eslint-disable @typescript-eslint/ban-types */
import {
  RoutingControllersOptions,
  createExpressServer,
  useContainer,
  useExpressServer,
} from "routing-controllers";
import express from "express";
import { Container, Service } from "typedi";
import { LogProfile } from "@similie/shared-microservice-utils";
import cors from "cors";
import { Server } from "http";
import { INTERNAL_SERVICE_PORTS } from "./query-types";
import { Readable } from "stream";

export const CONTROLLER_SETUP_VALUE = "CONTROLLER_SETUP_CONTENT_NAME";
export const INTERNAL_HTTP_PORT = "INTERNAL_HTTP_PORT_VALUE";
export const INTERNAL_HTTP_PREFIX = "INTERNAL_HTTP_PREFIX_VALUE";
export const INTERNAL_HTTP_SERVER_OPTIONS = "INTERNAL_HTTP_SERVER_OPTIONS";
export const APPLICATION_SERVER_NAME = "APPLICATION_SERVER_NAME";

export class ControllerSetup {
  private _serverControllers: Function[] | string[];
  private _serverMiddleware: Function[] | string[];
  private _cors: boolean | Record<string, string>;
  public constructor(
    serverControllers: Function[] | string[],
    serverMiddleware?: Function[] | string[],
    cors: boolean | Record<string, string> = false,
  ) {
    this._serverControllers = serverControllers || [];
    this._serverMiddleware = serverMiddleware || [];
    this._cors = cors;
  }

  public get controllers() {
    return this._serverControllers;
  }

  public get middleware(): Function[] | string[] {
    return this._serverMiddleware;
  }

  public get cors(): boolean | Record<string, string> {
    return this._cors;
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
    this._app = express();
    if (setup.cors) {
      this._app.use(
        typeof setup.cors === "object" ? cors(setup.cors as any) : cors(),
      );
    }
    // Apply URL-encoded parser as middleware
    this._app.use(express.urlencoded({ extended: true }));
    this._app.use(express.json()); // For JSON parsing
    // 3) If you pass plain Express middlewares, register them here
    for (const mw of setup.middleware || []) {
      // Heuristic: plain function -> treat as Express middleware
      if (
        typeof mw === "function" &&
        !("prototype" in mw && (mw as any).prototype?.use)
      ) {
        this._app.use(mw as express.RequestHandler);
      }
    }

    useExpressServer(this._app, {
      controllers: setup.controllers,
      // bodyParser: false as any,
      // If you have RC middlewares decorated with @Middleware({ type: 'before'|'after' })
      // pass the CLASS references here, e.g. [AuthMiddleware, ErrorFormatterMiddleware]
      // You can filter them out of 'setup.middleware' like shown above, or keep a separate list.
      middlewares: (setup.middleware || []).filter((mw) => {
        return (
          typeof mw === "function" &&
          "prototype" in mw &&
          (mw as any).prototype?.use
        );
      }) as Function[],

      routePrefix: this.prefix,
      // You may also keep RC-managed CORS if you prefer; remove the app.use(cors) above in that case.
      // cors: setup.cors,
      // other routing-controllers options...
      defaultErrorHandler: true,
      ...options,
    }); // 5) Strip any RC-added body parsers to prevent double-parse

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
