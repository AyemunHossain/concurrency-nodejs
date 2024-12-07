import redis from "../microservices/redis-connect.js";

const trackOutGoingResponse = (req, res, next) => {
    const originalEnd = res.end;

    // Flag to track if res.end was called
    let responseEnded = false;

    // Override `res.end` to finalize and encrypt data
    res.end = async function (chunk, encoding, callback) {
        responseEnded = true; // Mark the response as completed
        if (req.is_reserve) {
            try {
                await redis.redisClient
                    .multi()
                    .rPush(req.TICKET_RESERVATION_LIST_KEY, req.reservedTicket.toString())
                    .exec();
                console.log("______________________res.end________________________");
            } catch (err) {
                console.error('Redis operation failed during response:', err);
            }
        }
        originalEnd.call(this, chunk, encoding, callback);
    };

    // Listen for the 'close' event for interruptions
    res.on('close', async () => {
        if (!responseEnded && req.is_reserve) {
            try {
                console.warn('Connection closed before response completed. Cleaning up Redis state.');
                // Perform Redis cleanup or other necessary fallback actions here
                await redis.redisClient
                    .multi()
                    .rPush(req.TICKET_RESERVATION_LIST_KEY, req.reservedTicket.toString())
                    .exec();
                    console.log("______________________res.close________________________");
            } catch (err) {
                console.error('Failed to clean up Redis state on close:', err);
            }
        }
    });

    next();
};

export default trackOutGoingResponse;
