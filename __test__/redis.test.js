const { redisClient } = require('../microservices/redis-connect');


describe('Redis Client', () => {
  it('should connect to Redis', async () => {
    await redisClient.connect();
    // expect(redis.createClient).toHaveBeenCalledWith(6379, 'localhost');
    expect(redisClient.connect).toHaveBeenCalled();
  });
});
