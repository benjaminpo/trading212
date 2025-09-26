// Mock NextAuth
const mockNextAuth = jest.fn();
jest.mock("next-auth", () => mockNextAuth);

// Mock auth options
jest.mock("@/lib/auth", () => ({
  authOptions: {
    providers: [],
    session: { strategy: "jwt" },
  },
}));

describe("NextAuth Route Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNextAuth.mockReturnValue({
      GET: jest.fn(),
      POST: jest.fn(),
    });
  });

  it("should export GET and POST handlers", () => {
    jest.isolateModules(() => {
      const { GET, POST } = require("@/app/api/auth/[...nextauth]/route");
      expect(GET).toBeDefined();
      expect(POST).toBeDefined();
    });
  });

  it("should call NextAuth with authOptions", () => {
    jest.isolateModules(() => {
      require("@/app/api/auth/[...nextauth]/route");
    });

    expect(mockNextAuth).toHaveBeenCalledWith({
      providers: [],
      session: { strategy: "jwt" },
    });
  });
});
