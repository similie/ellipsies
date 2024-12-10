import {
  EllipsiesController,
  ExpressRequest,
  ExpressResponse,
  ExpressNext,
  QueryAgent,
} from "../../index";
import {
  Get,
  UseBefore,
  // UseBefore
} from "routing-controllers";

// import { UserRequiredMiddleware } from '@similie/router-middleware-agents';
// import { UserRolesV1 } from '@similie/user-agent';
import { EllipsiesExtends } from "../../dynamic-routes";
import { DeepPartial } from "typeorm";
import { UserModel } from "../test-models";

export const MIN_USER_ROLE = 5;

@EllipsiesExtends("users")
export class UserController extends EllipsiesController<UserModel> {
  public constructor() {
    super(UserModel);
  }
  /**
   * @description example of how a route is overridden
   * @param {DeepPartial<User | User[]>} body
   * @returns {Promise<User | User[]>}
   */
  @UseBefore(
    async (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => {
      const userId = req.headers["x-content-user"];
      if (!userId) {
        return next("Authorization Required");
      }
      const agent = new QueryAgent<UserModel>(UserModel, {
        // where: { id: +userId },
      });
      const user = await agent.findOneById(userId);
      if (!user) {
        return next("User not found");
      }
      if ((user.role as number) < MIN_USER_ROLE) {
        return next("User does not have the required role");
      }
      return next();
    },
  )
  public override async create(body: DeepPartial<UserModel | UserModel[]>) {
    return super.create(body);
  }

  @Get("/test")
  public async test() {
    return { ok: "Test Complete" };
  }
}
