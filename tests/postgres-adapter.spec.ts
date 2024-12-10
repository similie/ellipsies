import { PostgresHostManager } from "../index";
import { Container } from "typedi";
import {
  testDataSourceCredentials,
  defaultTestDataSourceOpt,
} from "@similie/pg-microservice-datasource";
import { VariableModel } from "./models/test-variable";
const options = {
  ...defaultTestDataSourceOpt(),
  dropSchema: true,
  syncronize: true,
  migrationsRun: false,
};
describe("Postgres agent", () => {
  let pg: PostgresHostManager = Container.get(PostgresHostManager);
  describe("Host manager in test mode", () => {
    beforeAll(async () => {
      // create class reference for test mode
      pg = new PostgresHostManager();
      await pg.init([VariableModel], testDataSourceCredentials(), options);
      if (pg.isInitialized) {
        await pg.destroy();
      }
    });

    afterAll(async () => {
      // clean up
      if (pg) await pg.destroy();
    });

    it("Host manager can connect to the database", async () => {
      const initializeSpy = jest.spyOn(pg, "init");

      await pg.init([VariableModel], testDataSourceCredentials(), options);
      expect(initializeSpy).toHaveBeenCalled();
    });

    it("Host manager doesn`t throw on init when connected", async () => {
      expect(pg.datasource.isInitialized).toEqual(true);
      await pg.init([VariableModel], testDataSourceCredentials(), options);
      // Wait for initialization to complete (e.g., using a timeout or a promise)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await pg.datasource.synchronize(); // this is required when running in full test mode
      // cannot indentify the issue with the test. It might be an issue in typeorm
      expect(pg.datasource.isInitialized).toEqual(true);
    });

    it("should create an entity repository by name (string)", async () => {
      const variables = pg.getRepository("variable");
      const count = await variables.count();
      expect(count).toEqual(0);
    });

    it("should create an entity repository by class (Entity)", async () => {
      try {
        const variables = pg.getRepository(VariableModel);
        const count = await variables.count();
        expect(count).toEqual(0);
      } catch (e: any) {
        console.log("ERROR", e);
        expect(e.message).toEqual(null);
      }
    });

    it("should dis-connect from the postgres instance", async () => {
      await pg.destroy();
      expect(pg.isInitialized).toEqual(false);
      // pg = null;
    });
  });
});
