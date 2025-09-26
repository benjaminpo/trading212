// Mock for oauth4webapi library
module.exports = {
  generateCodeVerifier: jest.fn().mockReturnValue("mock-code-verifier"),
  generateCodeChallenge: jest.fn().mockReturnValue("mock-code-challenge"),
  calculateS256: jest.fn().mockReturnValue("mock-s256-hash"),
  parseWwwAuthenticateChallenges: jest.fn().mockReturnValue({}),
  validateAuthResponse: jest.fn().mockReturnValue({}),
  processAuthResponse: jest.fn().mockResolvedValue({}),
  processRevocationResponse: jest.fn().mockResolvedValue({}),
  processUserInfoResponse: jest.fn().mockResolvedValue({}),
  processIntrospectionResponse: jest.fn().mockResolvedValue({}),
  processRegistrationResponse: jest.fn().mockResolvedValue({}),
  processPushedAuthorizationResponse: jest.fn().mockResolvedValue({}),
};
