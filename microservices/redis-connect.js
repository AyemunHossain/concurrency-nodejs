import redis from 'redis';
import config from 'config';

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
    publisher
}