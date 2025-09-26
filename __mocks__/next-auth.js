// Mock for next-auth library
const mockGetServerSession = jest.fn();

module.exports = {
  default: jest.fn(),
  NextAuth: jest.fn().mockImplementation(() => ({
    handlers: {
      GET: jest.fn(),
      POST: jest.fn(),
    },
  })),
  getServerSession: mockGetServerSession,
  getSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
  SessionProvider: jest.fn(),
  // Mock the authOptions
  authOptions: {
    providers: [],
    callbacks: {
      session: jest.fn(),
      jwt: jest.fn(),
    },
    session: {
      strategy: "jwt",
    },
    secret: "mock-secret",
  },
};
