import { withCache, apiCache } from "@/lib/api-cache";
import logger from "@/lib/logger";

// Silence info logs
jest.spyOn(logger, "info").mockImplementation();

describe("withCache decorator", () => {
  beforeEach(async () => {
    await apiCache.invalidateAll();
    (logger.info as jest.Mock).mockClear();
  });

  it("caches results by user/account/type and returns hits on subsequent calls", async () => {
    class Service {
      async fetchData(_userId: string, _accountId: string) {
        return { value: Math.random() };
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Service.prototype,
      "fetchData",
    )!;
    withCache("portfolio", (userId: string, accountId: string) => ({
      userId,
      accountId,
    }))(Service.prototype as unknown as object, "fetchData", descriptor);
    Object.defineProperty(Service.prototype, "fetchData", descriptor);

    const service = new Service();

    const first = await service.fetchData("u1", "a1");
    const second = await service.fetchData("u1", "a1");

    expect(second).toEqual(first);
  });

  it("uses params in key generation to avoid collisions", async () => {
    class Service {
      async listPositions(
        _userId: string,
        _accountId: string,
        includeClosed: boolean,
      ) {
        return { items: includeClosed ? ["closed"] : ["open"] };
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      Service.prototype,
      "listPositions",
    )!;
    withCache(
      "positions",
      (userId: string, accountId: string, includeClosed: boolean) => ({
        userId,
        accountId,
        params: { includeClosed },
      }),
    )(Service.prototype as unknown as object, "listPositions", descriptor);
    Object.defineProperty(Service.prototype, "listPositions", descriptor);

    const service = new Service();

    const open = await service.listPositions("u1", "a1", false);
    const closed = await service.listPositions("u1", "a1", true);

    expect(open).toEqual({ items: ["open"] });
    expect(closed).toEqual({ items: ["closed"] });
  });
});
