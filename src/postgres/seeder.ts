import { LogProfile } from "@similie/shared-microservice-utils";
import { DataSourceRegistry } from "./datasource-registry";
type SeedProvider = () => any[] | Promise<any[]>;

function resolveEntityClass(meta: any): any {
  return (
    meta?.tableMetadataArgs?.target || // most reliable
    meta?.target?.prototype?.constructor || // unwrap prototype
    meta?.target?.constructor || // direct constructor
    meta?.target // as-is
  );
}
async function getSeedsFromEntity(ctor: any): Promise<any[] | undefined> {
  if (!ctor) return;

  // 1) Static seeds() method
  if (typeof ctor.seeds === "function") {
    const res = await ctor.seeds();
    return Array.isArray(res) ? res : undefined;
  }

  // 2) Static seeds array
  if (Array.isArray(ctor.SEEDS)) return ctor.SEEDS;

  // 3) Reflect metadata (if you prefer decorating)
  const viaReflect = Reflect.getMetadata?.("seeds", ctor);
  if (typeof viaReflect === "function") {
    const res = await (viaReflect as SeedProvider)();
    return Array.isArray(res) ? res : undefined;
  }
  if (Array.isArray(viaReflect)) return viaReflect;

  // 4) Instance method on prototype
  const protoSeeds = ctor.prototype?.seeds;
  if (typeof protoSeeds === "function") {
    // Try to instantiate (zero-arg ctor) and call instance.seeds()
    try {
      const instance = new ctor();
      const res = await instance.seeds();
      return Array.isArray(res) ? res : undefined;
    } catch {
      // If ctor needs args, try calling the prototype method unbound.
      // Works if seeds() doesn’t use `this`.
      try {
        const res = await protoSeeds.call(undefined);
        return Array.isArray(res) ? res : undefined;
      } catch {
        // ignore
      }
    }
  }

  return;
}
export class SeederService {
  private logger = new LogProfile("SeederService");

  async run(): Promise<void> {
    const ds = DataSourceRegistry.getInstance().dataSource;
    if (!ds) throw new Error("Data source not initialized");
    this.logger.log.info("🌱 Running database seeder...");
    for (const meta of ds.entityMetadatas) {
      const entityClass = resolveEntityClass(meta);
      const entityName = entityClass?.name || meta.name || "UnknownEntity";

      const seeds = await getSeedsFromEntity(entityClass);
      if (!seeds || seeds.length === 0) continue;

      const repo = ds.getRepository(entityClass);
      const count = await repo.count();

      if (count === 0) {
        const records = seeds.map((s) => repo.create(s)); // hydrate entities
        await repo.save(records); // runs all hooks and default logic
        this.logger.log.info(
          `✅ Seeded ${seeds.length} record(s) into ${entityName}`,
        );
      } else {
        this.logger.log.info(
          `ℹ️  ${entityName} already has ${count} record(s), skipping`,
        );
      }
    }
    this.logger.log.info("🌾 Seeding complete.");
  }
}
