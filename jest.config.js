module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  setupFilesAfterEnv: ['./test/setup-test.js'],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/test/mocks/fileMock.js',
    '^qr-scanner$': '<rootDir>/test/mocks/qrScannerMock.js'
  },
  testMatch: ['**/test/unit/**/*.test.js'],
};
