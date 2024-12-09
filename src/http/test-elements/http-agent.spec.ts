/* eslint-disable object-curly-spacing */
import "reflect-metadata";
import { sendSeeds } from "./test-seeder";
import { HTTPConnector, applyStaticLiveConnect } from "@similie/http-connector";
import { getId } from "@similie/model-connect-entities";
import {
  User,
  Passport,
  PassportModel,
  UserModel,
  IUser,
  IPassport,
} from "./test-models";

import { Ellipsies } from "../ellipsies";
import {
  testDataSourceCredentials,
  defaultTestDataSourceOpt,
} from "@similie/pg-microservice-datasource";
import { UserController, PassportController } from "./controllers";

const COMMON_API_SERVICE_ROUTES = "/service/api/v2/";
const INTERNAL_SERVICE_PORTS = 9999;
const DELAY_SERVER_SHUTDOWN = 30000;
const DELAY_SERVER_SHUTDOWN_ON = false;
const USER_HEADER = "x-content-user";

const serverUrl = `http://localhost:${INTERNAL_SERVICE_PORTS}${COMMON_API_SERVICE_ROUTES}`;
const connector = new HTTPConnector(serverUrl);
applyStaticLiveConnect(connector);

connector.userContent = {
  [USER_HEADER]: "1",
};

const user = new User();
const passport = new Passport();
//eslint-disable-next-line @typescript-eslint/no-explicit-any
const extras: any = {};

describe("HTTP Agent Generic Controller CRUD", () => {
  describe("HTTP Agent Generic Controller CRUD", () => {
    let server: Ellipsies | undefined;
    beforeAll(async () => {
      // console.log("GETTING THIS WORKING", controllers);
      const ellipsies = new Ellipsies({
        models: [UserModel, PassportModel],
        controllers: [UserController, PassportController], // controllers,
        port: INTERNAL_SERVICE_PORTS,
        prefix: COMMON_API_SERVICE_ROUTES,
      });
      await ellipsies.setDataSource(testDataSourceCredentials(), {
        ...defaultTestDataSourceOpt(),
        dropSchema: true,
        migrationsRun: false,
      });
      await ellipsies.start();

      await sendSeeds(ellipsies.pgManager);
      server = ellipsies;
    });

    it("should find two users", async () => {
      const results = await user.find().fetch();
      expect(results.length).toEqual(2);
    });

    it("should return 1 users with limit", async () => {
      const results = await user.find().limit(1).fetch();
      expect(results.length).toEqual(1);
    });

    it("should return 0 users because we skip 2", async () => {
      const results = await user.find().skip(2).limit(1).fetch();
      expect(results.length).toEqual(0);
    });

    it("should return 1 users because with firstName Code", async () => {
      const results = await user
        .find({
          firstName: "Code",
        })
        .fetch();
      expect(results.length).toEqual(1);
    });

    it("should return 1 users because with firstName Code", async () => {
      const results = await user
        .find({
          firstName: { contains: "Code" },
        })
        .fetch();
      expect(results.length).toEqual(1);
    });

    it("should return 2 users because with firstName Code or with Ibnu", async () => {
      const results = await user
        .find({
          or: [
            { firstName: { contains: "Code" } },
            { firstName: { contains: "Ibnu" } },
          ],
        })
        .fetch();
      expect(results.length).toEqual(2);
    });

    it("should return 0 users in our or clause because we use fake names", async () => {
      const results = await user
        .find({
          or: [
            { firstName: { contains: "Fast" } },
            { firstName: { contains: "Fun" } },
          ],
        })
        .fetch();
      expect(results.length).toEqual(0);
    });

    it("should return 1 users in our or clause because we find the user with id > 1", async () => {
      const results = await user
        .find({
          or: [
            { firstName: { contains: "Fast" } },
            { firstName: { contains: "Fun" } },
            { id: { ">": 1 } },
          ],
        })
        .fetch();
      expect(results.length).toEqual(1);
    });

    it("should return 1 users with ID 1", async () => {
      const results = await user.initWithId(1).fetch();
      expect(results.id).toEqual(1);
    });

    it("should return 1 users with first name Ibnu", async () => {
      const results = await user.find({ firstName: "Ibnu" }).fetchOne();
      expect(results.id).not.toBe(undefined);
    });

    it("should return 1 users with first name Ibnu", async () => {
      const results = await user
        .find({ firstName: "Ibnu" })
        .populate("requestor")
        .fetchOne();
      expect(results.id).not.toBe(undefined);
      if (typeof results.requestor === "number") {
        return expect(results.requestor).not.toBeInstanceOf("number");
      }
      expect(results.requestor!.id).not.toBe(undefined);
    });

    it("should return 2 users with populate all", async () => {
      const results = await user.find().populateAll().fetch();
      expect(results.length).toBe(2);
      for (const result of results) {
        expect(result.id).not.toBe(undefined);
        if (typeof result.requestor === "number") {
          return expect(result.requestor).not.toBeInstanceOf("number");
        }
        expect(result.requestor!.id).not.toBe(undefined);
      }
    });

    it("should create 1 user with create and populate the relations", async () => {
      const createdUser = await user.create({
        firstName: "Adam",
        lastName: "Smith",
        userName: "guernica131",
        email: "user@gmail.com",
        active: true,
        requestor: 1,
        role: 3,
      });
      expect(createdUser.id).not.toBe(undefined);
      if (typeof createdUser.requestor === "number") {
        return expect(createdUser.requestor).not.toBeInstanceOf("number");
      }
      expect(createdUser.requestor!.id).not.toBe(undefined);
    });

    it("should reject the creation of a user given we try to populate it with an a lower role", async () => {
      connector.userContent = {
        [USER_HEADER]: "3",
      };
      let error = false;
      try {
        const createdUser = await user.create({
          firstName: "Adam",
          lastName: "Smith",
          userName: "guernica1314",
          email: "user@gmail2.com",
          active: true,
          requestor: 1,
        });
        expect(createdUser).not.toBe(undefined);
      } catch (e) {
        error = true;
      }
      connector.userContent = {
        [USER_HEADER]: "1",
      };
      expect(error).toBe(true);
    });

    it("should create 3 users with createMany and populate the relations", async () => {
      const createdUsers = await user.createMany([
        {
          firstName: "Adam",
          lastName: "Smith",
          userName: "guernica131-1",
          active: true,
          email: "user1@gmail.com",
          requestor: 1,
        },
        {
          firstName: "Badam",
          lastName: "Smith",
          userName: "guernica131-2",
          email: "user2@gmail.com",
          active: true,
          requestor: 2,
        },
        {
          firstName: "Gadam",
          lastName: "Smith",
          userName: "guernica131-3",
          email: "user3@gmail.com",
          active: true,
          requestor: 3,
        },
      ]);

      expect(createdUsers.length).toBe(3);
      for (const createdUser of createdUsers) {
        expect(createdUser.id).not.toBe(undefined);
        if (typeof createdUser.requestor === "number") {
          return expect(createdUser.requestor).not.toBeInstanceOf("number");
        }
        expect(createdUser.requestor!.id).not.toBe(undefined);
      }
      extras.createdUsers = createdUsers;
    });

    it("should save 1 user with a new name", async () => {
      extras.oldUsername = extras.createdUsers[0].userName;
      const newUsername = "guernica0131-1000";
      extras.createdUsers[0].userName = newUsername;
      const updatedUser = await user.save(extras.createdUsers[0]);
      expect(updatedUser.userName).toBe(newUsername);
      extras.newUsername = newUsername;
    });

    it("should save 1 user with a new name", async () => {
      const newUsername = "guernica0131-1000";
      extras.createdUsers[0].userName = newUsername;
      const updatedUsers = await user.update(
        { userName: extras.newUsername },
        { userName: extras.oldUsername },
      );
      expect(updatedUsers.length).toBe(1);
      for (const updatedUser of updatedUsers) {
        expect(updatedUser.userName).toBe(extras.oldUsername);
      }
    });

    it("should the total number of users", async () => {
      const userCount = await user.count();
      expect(userCount).toBe(6);
    });

    it("should the total number of users where the id > 2", async () => {
      const userCount = await user.count({ id: { ">": 2 } });
      expect(userCount).toBe(4);
    });

    it("should delete the selected user", async () => {
      const deleteUser = extras.createdUsers[0];
      const deletedUser = await user.destroy(deleteUser);
      if (!deletedUser) {
        return expect(deletedUser).toBe(true);
      }
      const results = await user.initWithId(deletedUser.id).fetch();
      expect(results).toBe(null);
    });

    it("should delete the users above ID 3", async () => {
      const deletedUsers = await user.destroyAll({ id: { ">": 3 } });
      expect(deletedUsers.length).toBeGreaterThan(0);
      for (const deletedUser of deletedUsers) {
        const results = await user.initWithId(deletedUser.id).fetch();
        expect(results).toBe(null);
      }
    });

    it("should populate all the attributes", async () => {
      const attrs = await user.attr();
      expect(Object.keys(attrs).length).toBeGreaterThan(0);
      expect(attrs["userName"].type).toBe("text");
    });

    it("should the id attributes", async () => {
      const sum = await user.sum("id");
      expect(sum.sum).toBe(6);
      const newSum = await user.sum("id", { id: { "<": 3 } });
      expect(newSum.sum).toBe(3);
    });

    it("should average the id attributes", async () => {
      const avg = await user.avg("id");
      expect(avg.avg).toBe(2);
      const newAvg = await user.avg("id", { id: { "<": 3 } });
      expect(newAvg.avg).toBe(1.5);
    });

    it("should populate a new passport", async () => {
      const user1 = await user.initWithId(1).fetch();
      extras.createdPassport = await passport.create({
        password: "Boomo!",
      });
      const value = (await user1.passports!.addToCollection(
        extras.createdPassport,
      )) as IPassport;

      if (!value) {
        return expect(null).toBe(getId(user1));
      }
      expect(getId(value?.user)).toBe(getId(user1));
      const user1Reload = await user
        .initWithId(1)
        .populate("passports")
        .fetch();
      expect(getId(user1Reload.passports![0])).toBe(
        getId(extras.createdPassport),
      );
    });

    it("should depopulate a new passport", async () => {
      const user1 = await user.initWithId(1).fetch();
      const value = (await user1.passports!.removeFromCollection(
        extras.createdPassport,
      )) as IPassport;
      if (!value) {
        return expect(null).toBe(getId(user1));
      }
      expect(getId(value!.user)).toBe(null);
      const user1Reload = await user.initWithId(1).populate("passport").fetch();
      expect(user1Reload.passports!.length).toBe(0);
    });

    it("should stream each record", async () => {
      let count = 0;
      await user
        .stream({})
        .eachRecord((user: IUser) => {
          count++;
          expect(getId(user)).not.toBe(null);
        })
        .fetch();
      expect(count).not.toBe(0);
    });

    it("should stream each record with where query", async () => {
      let count = 0;
      await user
        .stream({ id: { ">": 1 } })
        .eachRecord((user: IUser) => {
          count++;
          expect(getId(user)).not.toBe(null);
        })
        .fetch();

      expect(count).toBe(2);
    });

    it("should stream 1 record by limit", async () => {
      let count = 0;
      await user
        .stream({})
        .limit(1)
        .eachRecord((user: IUser) => {
          count++;
          expect(getId(user)).not.toBe(null);
        })
        .fetch();

      expect(count).toBe(1);
    });

    it("should stream 1 record by skip", async () => {
      let count = 0;
      await user
        .stream({})
        .skip(2)
        .eachRecord((user: IUser) => {
          count++;
          expect(getId(user)).not.toBe(null);
        })
        .fetch();

      expect(count).toBe(1);
    });

    it("should Batch stream 3 record 1 each", async () => {
      let count = 0;
      await user
        .stream({})
        .eachBatch(1, (user: IUser[]) => {
          count++;
          expect(user).toBeInstanceOf(Array);
          expect(getId(user[0])).not.toBe(null);
        })
        .fetch();
      expect(count).toBe(3);
    });

    it("should Batch stream 1 batch 3 each", async () => {
      let count = 0;
      await user
        .stream({})
        .eachBatch(10, (users: IUser[]) => {
          count++;
          expect(users).toBeInstanceOf(Array);
          expect(users.length).toBe(3);
          expect(getId(users[0])).not.toBe(null);
        })
        .fetch();
      expect(count).toBe(1);
    });

    it("should find or created a user, in this case create", async () => {
      const newFind = {
        firstName: "Badam",
        lastName: "Smith",
        userName: "guernica131-2",
        email: "user2@gmail.com",
        active: true,
        requestor: 2,
      };
      const foundUser = await user.findOrCreate(
        {
          userName: newFind.userName,
        },
        newFind,
      );
      expect(getId(foundUser)).toBeGreaterThan(3);
      expect(foundUser.userName).toBe(newFind.userName);
    });

    it("should find or created a user, in this case find", async () => {
      const user1 = await user.initWithId(1).fetch();
      const foundUser = await user.findOrCreate(
        {
          userName: user1.userName,
        },
        user1,
      );
      expect(getId(foundUser)).toBe(getId(user1));
    });

    it("should run hit an non standard route with the query option", async () => {
      const results = await user.query("test", []);
      expect(results.ok).toBe("Test Complete");
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(
          async () => {
            await server?.shutdown();
            resolve();
          },
          DELAY_SERVER_SHUTDOWN_ON ? DELAY_SERVER_SHUTDOWN : 0,
        );
      });
    }, DELAY_SERVER_SHUTDOWN + 100);
  });
});
