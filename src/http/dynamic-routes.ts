/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ControllerFunctionNames,
  ControllerRoutes,
  EllipsiesController,
} from "./http-agent";
import { IModelValues } from "./query-types";
import {
  Get,
  Param,
  QueryParam,
  Req,
  Post,
  Body,
  Put,
  Delete,
  Res,
  JsonController,
} from "routing-controllers";
import { Service } from "typedi";

/**
 * @name EllipsiesExtends
 * @description a class decorator that reduces code redundancy due
 *   to a problem with extending routing controllers
 * @param {string} path
 * @returns {Function}
 */
export const EllipsiesExtends = <T extends IModelValues>(
  path: string,
): Function => {
  return function <U extends new (...args: any[]) => EllipsiesController<T>>(
    constructor: U,
  ) {
    Service()(constructor);
    JsonController(path)(constructor);
    const route = new DynamicRoutes<T>(constructor);
    route.apply();
  };
};

type attributesDetails = {
  func: Function;
  options: any[];
};

type RouteContent = {
  attributes: attributesDetails[];
  path: string | ControllerRoutes;
  decorator: Function;
  name: string;
};
/**
 * @class
 * @name DynamicRoutes
 * @description called by ExtendedModelController decorator to
 *  do the work of building the dynamic prototype routes on the
 *  model
 */
class DynamicRoutes<T extends IModelValues> {
  private parentClass: new (...args: any[]) => EllipsiesController<T>;
  /**
   * RouteContent array containing the prototype details
   */
  private _routes: RouteContent[] = [
    {
      path: ControllerRoutes.ROOT,
      attributes: [{ func: Req, options: [] }],
      decorator: Get,
      name: ControllerFunctionNames.FIND,
    },

    {
      path: ControllerRoutes.SUM,
      attributes: [
        { func: Param, options: ["attr"] },
        { func: Req, options: [] },
      ],
      decorator: Get,
      name: ControllerFunctionNames.SUM,
    },
    {
      path: ControllerRoutes.AVG,
      attributes: [
        { func: Param, options: ["attr"] },
        { func: Req, options: [] },
      ],
      decorator: Get,
      name: ControllerFunctionNames.AVG,
    },
    {
      path: ControllerRoutes.COUNT,
      attributes: [{ func: Req, options: [] }],
      decorator: Get,
      name: ControllerFunctionNames.COUNT,
    },
    {
      path: ControllerRoutes.ID,
      attributes: [
        { func: Param, options: ["id"] },
        { func: QueryParam, options: ["populate"] },
      ],
      decorator: Get,
      name: ControllerFunctionNames.FIND_ONE,
    },
    {
      path: ControllerRoutes.SCHEMA,
      attributes: [],
      decorator: Get,
      name: ControllerFunctionNames.SCHEMA,
    },
    {
      path: ControllerRoutes.STREAM,
      attributes: [
        { func: Req, options: [] },
        { func: Res, options: [] },
      ],
      decorator: Get,
      name: ControllerFunctionNames.STREAM,
    },
    {
      path: ControllerRoutes.STREAM_BATCH,
      attributes: [
        { func: Param, options: ["limiter"] },
        { func: Req, options: [] },
        { func: Res, options: [] },
      ],
      decorator: Get,
      name: ControllerFunctionNames.STREAM_BATCH,
    },
    {
      path: ControllerRoutes.POPULATE,
      attributes: [
        { func: Param, options: ["id"] },
        { func: Param, options: ["value"] },
        { func: Param, options: ["attr"] },
      ],
      decorator: Put,
      name: ControllerFunctionNames.POPULATE,
    },

    {
      path: ControllerRoutes.POPULATE,
      attributes: [
        { func: Param, options: ["id"] },
        { func: Param, options: ["value"] },
        { func: Param, options: ["attr"] },
      ],
      decorator: Delete,
      name: ControllerFunctionNames.DEPOPULATE,
    },

    {
      path: ControllerRoutes.SEEK,
      attributes: [{ func: Body, options: [{ required: true }] }],
      decorator: Post,
      name: ControllerFunctionNames.SEEK,
    },
    {
      path: ControllerRoutes.ROOT,
      attributes: [{ func: Body, options: [{ required: true }] }],
      decorator: Post,
      name: ControllerFunctionNames.CREATE,
    },
    {
      path: ControllerRoutes.ROOT,
      attributes: [{ func: Body, options: [{ required: true }] }],
      decorator: Put,
      name: ControllerFunctionNames.UPDATE,
    },
    {
      path: ControllerRoutes.ID,
      attributes: [
        { func: Param, options: ["id"] },
        { func: Body, options: [] },
      ],
      decorator: Put,
      name: ControllerFunctionNames.UPDATE_ONE,
    },
    {
      path: ControllerRoutes.ROOT,
      attributes: [{ func: Body, options: [{ required: true }] }],
      decorator: Delete,
      name: ControllerFunctionNames.DESTROY,
    },
    {
      path: ControllerRoutes.ID,
      attributes: [{ func: Param, options: ["id"] }],
      decorator: Delete,
      name: ControllerFunctionNames.DESTROY_ONE,
    },

    {
      path: ControllerRoutes.SEEK,
      attributes: [{ func: Param, options: ["id"] }],
      decorator: Delete,
      name: ControllerFunctionNames.DESTROY_ONE,
    },
  ];
  /**
   * @constructor
   * @param {function(...args: any[]):ModelController<T>} routeConstructor
   */
  public constructor(
    private routeConstructor: new (...args: any[]) => EllipsiesController<T>,
  ) {
    this.parentClass = Object.getPrototypeOf(routeConstructor) as new (
      ...args: any[]
    ) => EllipsiesController<T>;
  }

  private get routes() {
    return this._routes;
  }

  /**
   * @name isFunction
   * @description does the function exist on the
   *  existing prototype
   * @param {string} attr
   * @returns {boolean}
   */
  private isFunction(attr: string) {
    const proto = Object.getOwnPropertyDescriptor(
      this.routeConstructor.prototype,
      attr,
    ) as any;
    return !!proto || (proto && typeof proto.value === "function");
  }

  /**
   * @name applyAttributes
   * @description applies the parameter decorators
   *  as defined by the RouteContent model
   * @param {RouteContent} details
   * @returns {void}
   */
  private applyAttributes(details: RouteContent) {
    details.attributes.forEach((attr: attributesDetails, index: number) => {
      attr.func(...attr.options)(
        this.routeConstructor.prototype,
        details.name,
        index,
      );
    });
  }
  /**
   * @name buildRoutingFunction
   * @description applies a generic function for
   * sending the data to the parent class
   * @param {RouteContent} details
   * @returns {void}
   */
  private buildRoutingFunction(details: RouteContent) {
    const parentClass = this.parentClass;
    this.routeConstructor.prototype[details.name] = async function (
      ...args: any[]
    ): Promise<any> {
      return parentClass.prototype[details.name].call(this, ...args);
    };
  }
  /**
   * @name applyDecorator
   * @description applies the decorator
   * to the function for routing
   * @param {RouteContent} details
   * @returns {void}
   */
  private applyDecorator(details: RouteContent) {
    // Apply the decorator to the prototype method
    details.decorator(details.path)(
      this.routeConstructor.prototype,
      details.name,
    );
  }

  /**
   * @name setRoute
   * @description wrapper function for apply the prototype
   * functions to the object
   * @param {RouteContent} details
   * @returns {void}
   */
  private setRoute(details: RouteContent) {
    if (!this.isFunction(details.name)) {
      this.buildRoutingFunction(details);
    }
    this.applyDecorator(details);
    this.applyAttributes(details);
  }
  /**
   * @name buildGetRoutes
   * @description cycles all the RouteContent content
   *  objects to build the prototypes
   * @returns {void}
   */
  private buildGetRoutes() {
    for (const route of this.routes) {
      this.setRoute(route);
    }
  }

  //   /**
  //    *
  //    * @param {string} name
  //    * @param {Object} object
  //    * @returns {void}
  //    */
  //   public applySingleFunctionRoute(name: string, object: Object) {
  //     const [route] = this.routes.filter((f: RouteContent) => f.name === name);
  //     if (!route) {
  //       return;
  //     }

  //     route.decorator(route.path)(object, route.name);
  //     route.attributes.forEach((attr: attributesDetails, index: number) => {
  //       attr.func(...attr.options)(object, route.name, index);
  //     });
  //   }

  /**
   * @public
   * @name apply
   * @description public function for running the actions
   * @returns {void}
   */
  public apply() {
    this.buildGetRoutes();
  }
}
