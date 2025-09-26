import { authOptions } from "@/lib/auth";

describe("Auth Extended Tests", () => {
  describe("Configuration", () => {
    it("should have correct session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("should have correct sign-in page", () => {
      expect(authOptions.pages?.signIn).toBe("/auth/signin");
    });

    it("should have Google provider configured", () => {
      const googleProvider = authOptions.providers.find(
        (p) => p.id === "google",
      );
      expect(googleProvider).toBeDefined();
      expect(googleProvider?.name).toBe("Google");
    });

    it("should have credentials provider configured", () => {
      const credentialsProvider = authOptions.providers.find(
        (p) => p.id === "credentials",
      );
      expect(credentialsProvider).toBeDefined();
      expect(credentialsProvider?.name).toBe("Credentials");
    });
  });

  describe("JWT Callback", () => {
    it("should add user id to token when user is provided", async () => {
      const mockUser = { id: "user123", email: "test@example.com" };
      const mockToken = { sub: "user123" };

      const result = await authOptions.callbacks!.jwt!({
        token: mockToken,
        user: mockUser,
      });

      expect(result).toEqual({
        sub: "user123",
        id: "user123",
      });
    });

    it("should return token unchanged when no user is provided", async () => {
      const mockToken = { sub: "user123", id: "user123" };

      const result = await authOptions.callbacks!.jwt!({
        token: mockToken,
        user: undefined,
      });

      expect(result).toEqual(mockToken);
    });
  });

  describe("Session Callback", () => {
    it("should add user id to session when token is provided", async () => {
      const mockSession = {
        user: { email: "test@example.com", name: "Test User" },
        expires: "2024-01-01",
      };
      const mockToken = { id: "user123" };

      const result = await authOptions.callbacks!.session!({
        session: mockSession,
        token: mockToken,
      });

      expect(result).toEqual({
        user: {
          email: "test@example.com",
          name: "Test User",
          id: "user123",
        },
        expires: "2024-01-01",
      });
    });

    it("should return session unchanged when no token is provided", async () => {
      const mockSession = {
        user: { email: "test@example.com", name: "Test User" },
        expires: "2024-01-01",
      };

      const result = await authOptions.callbacks!.session!({
        session: mockSession,
        token: undefined,
      });

      expect(result).toEqual(mockSession);
    });
  });
});
