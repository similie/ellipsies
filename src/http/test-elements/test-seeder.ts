import { PostgresHostManager } from "../../postgres";
// import Container from 'typedi';
export const sendSeeds = async (manager: PostgresHostManager) => {
  const seeds = ["user"];
  for (const seed of seeds) {
    const { seeds } = await import(`./seeds/${seed}.ts`);
    const created = await manager.getRepository(seed).create(seeds);
    await manager.getRepository(seed).save(created);
  }
};
