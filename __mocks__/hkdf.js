// Mock for @panva/hkdf library
module.exports = {
  default: jest.fn().mockResolvedValue(new Uint8Array(32)),
  derive: jest.fn().mockResolvedValue(new Uint8Array(32))
}
