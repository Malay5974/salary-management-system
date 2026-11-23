import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requestUser: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@/server/auth/session", () => ({
  requestUser: mocks.requestUser,
  hashPassword: () => ({ salt: "salt", hash: "hash" }),
}));
vi.mock("@/server/db/connection", () => ({
  getDatabase: () => ({ query: mocks.query, execute: mocks.execute }),
}));
import { GET, POST, PATCH } from "@/app/api/users/route";

const request = (method: string, body?: unknown) =>
  new Request("http://localhost/api/users", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
beforeEach(() => vi.resetAllMocks());
describe("HR management authorization", () => {
  it.each([
    null,
    { role: "hr", mustChangePassword: 0 },
    { role: "admin", mustChangePassword: 1 },
  ])("rejects unauthorized identity %j for every operation", async (user) => {
    mocks.requestUser.mockResolvedValue(user);
    expect((await GET(request("GET"))).status).toBe(403);
    expect((await POST(request("POST", {}))).status).toBe(403);
    expect((await PATCH(request("PATCH", {}))).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("prevents an admin from creating another admin through request fields", async () => {
    mocks.requestUser.mockResolvedValue({
      role: "admin",
      mustChangePassword: 0,
    });
    const response = await POST(
      request("POST", {
        name: "Another admin",
        email: "admin2@example.test",
        role: "admin",
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("returns active and disabled HR accounts to the admin", async () => {
    mocks.requestUser.mockResolvedValue({
      role: "admin",
      mustChangePassword: 0,
    });
    const users = [
      { id: "2", active: 1 },
      { id: "3", active: 0 },
    ];
    mocks.query.mockResolvedValue(users);
    expect(await (await GET(request("GET"))).json()).toEqual(users);
    expect(mocks.query.mock.calls[0][1]).toEqual(["hr"]);
  });
});
