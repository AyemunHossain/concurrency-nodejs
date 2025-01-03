// Mock for mysql2
// Mock the mysql2 library
jest.mock('mysql2', () => {
  const actualMysql = jest.requireActual('mysql2');
  return {
    ...actualMysql,
    createPoolCluster: jest.fn(() => {
      const poolCluster = {
        add: jest.fn(),
        getConnection: jest.fn((group, callback) => {
          callback(null, {
            query: jest.fn(),
            release: jest.fn(),
            threadId: 1,
          });
        }),
        on: jest.fn(),
        end: jest.fn((callback) => {
          callback();
        }),
      };
      return poolCluster;
    }),
  };
});

// Mock the mysql2/promise library
jest.mock('mysql2/promise', () => {
  return {
    createPoolCluster: jest.fn(() => {
      return {
        getConnection: jest.fn().mockResolvedValue({
          query: jest.fn(),
          release: jest.fn(),
        }),
      };
    }),
  };
});

// Mock for config
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const mockConfig = {
      'mysqldb.host': 'localhost',
      'mysqldb.username': 'root',
      'mysqldb.password': 'password',
      'mysqldb.db': 'test_db',
      'mysqldb.port': 3306,
      'mysqldb.connectionLimit': 10,
      'mysqldb.queueLimit': 0,
    };
    return mockConfig[key];
  }),
}));



// Mock for redis
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(), // Mock the `set` method (if used)
    setEx: jest.fn(), // Mock the `setEx` method (if used
    del: jest.fn(),
  };

  return {
    createClient: jest.fn(() => mockRedisClient),
  };
});


// Mock for config
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const mockConfig = {
      'redis.port': 6379,
      'redis.host': 'localhost',
    };
    return mockConfig[key];
  }),
}));
