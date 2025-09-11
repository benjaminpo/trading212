// Mock for openid-client library
module.exports = {
  Issuer: {
    discover: jest.fn().mockResolvedValue({
      metadata: {
        issuer: 'https://mock-issuer.com',
        authorization_endpoint: 'https://mock-issuer.com/auth',
        token_endpoint: 'https://mock-issuer.com/token',
        userinfo_endpoint: 'https://mock-issuer.com/userinfo'
      },
      Client: jest.fn().mockImplementation(() => ({
        authorizationUrl: jest.fn().mockReturnValue('https://mock-auth-url.com'),
        callbackParams: jest.fn().mockReturnValue({ code: 'mock-code' }),
        callback: jest.fn().mockResolvedValue({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          id_token: 'mock-id-token'
        }),
        userinfo: jest.fn().mockResolvedValue({
          sub: 'mock-user-id',
          email: 'mock@example.com',
          name: 'Mock User'
        }),
        refresh: jest.fn().mockResolvedValue({
          access_token: 'mock-refreshed-token'
        })
      }))
    })
  },
  generators: {
    state: jest.fn().mockReturnValue('mock-state'),
    nonce: jest.fn().mockReturnValue('mock-nonce'),
    codeVerifier: jest.fn().mockReturnValue('mock-code-verifier'),
    codeChallenge: jest.fn().mockReturnValue('mock-code-challenge')
  }
}
