import redis from 'redis';
import config from 'config';
import { v4 as uuidv4 } from 'uuid'; // Use uuid library for generating unique lock values

let redisClient = redis.createClient(
    config.get(`redis.port`),
    config.get(`redis.host`)
);


const subscriber = redis.createClient(
    config.get(`redis.port`),
    config.get(`redis.host`));

const publisher = redis.createClient(
    config.get(`redis.port`),
    config.get(`redis.host`));


async function connectRedis() {
    await redisClient.connect();
    await subscriber.connect();
    await publisher.connect();
    // console.log('Connected to Redis');
}

connectRedis().catch(console.error);

// Acquire the lock
async function acquireLock(lockKey, lockTimeout = 5, maxRetries = 5, retryDelay = 1000) {
    try {
        console.log('Acquiring lock');
        let attempt = 0;

        while (attempt < maxRetries) {
            attempt++;
            const lockValue = uuidv4();
            const result = await redisClient.setNX(lockKey, lockValue);

            if (result) {
                await redisClient.expire(lockKey, lockTimeout);
                return lockValue;
            } else {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        console.log('Failed to acquire lock after max retries');
        return null;

    } catch (e) {
        console.log(e);
        return null; 
    }
}



// Release the lock
async function releaseLock(lockKey, lockValue) {
    // Compare and delete the lock only if it is the current process's lock
    const currentLockValue = await redisClient.get(lockKey);
    if (currentLockValue === lockValue) {
        await redisClient.del(lockKey);  // Release the lock
        console.log('Lock released');
    } else {
        console.log('Attempt to release a lock that is not held by this process');
    }
}


redisClient.on("error", function (error) { console.error(error) });
// redisClient.on("ready", () => console.log(`Redis client is ready`));
redisClient.on("end", () => console.log(`Redis client has closed.`));
redisClient.on("reconnecting", (o) => {
    console.log(`Redis client is reconnecting.`);
    // console.log(`Attempt number ${o}.`);
    // console.log(`Milliseconds since last attempt: ${o}.`);
});
redisClient.on("connect", () => {
    console.log('Redis client connected');
})

subscriber.on("connect", () => {
    console.log('Redis publisher connected');
})


publisher.on("connect", () => {
    console.log('Redis publisher connected');
})

redisClient.on("warning", (o) => {
    console.log(`Redis client warning.`);
    // console.log(`Attempt number ${o}.`);
    // console.log(`Milliseconds since last attempt: ${o}.`);
});


export default {
    redisClient,
    subscriber,
    publisher,
    acquireLock,
    releaseLock
}