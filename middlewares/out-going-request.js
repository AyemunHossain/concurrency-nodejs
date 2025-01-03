// Improved Middleware for Tracking Outgoing Response
import redis from "../microservices/redis-connect.js";

const trackOutgoingResponse = (req, res, next) => {
  const originalEnd = res.end;
  let responseEnded = false;

  // Override res.end to handle response completion
  res.end = async function (chunk, encoding, callback) {
    responseEnded = true;
    await handleReservationCleanup(req, 'Response ended normally.');
    originalEnd.call(this, chunk, encoding, callback);
  };

  // Listen for the 'close' event for unexpected interruptions
  res.on('close', async () => {
    if (!responseEnded) {
      await handleReservationCleanup(req, 'Connection closed prematurely.');
    }
  });

  next();
};

// Centralized Reservation Cleanup Function
async function handleReservationCleanup(req, logMessage) {
  if (req.is_reserve && req.TICKET_RESERVATION_SET_KEY && req.reservedTicket) {
    try {
      await redis.redisClient
        .sAdd(req.TICKET_RESERVATION_SET_KEY, req.reservedTicket.toString());
      //Publish ticket available
      const availabilityChannel = `ticket:availability:${req.reservedTicket.toString()}`;
      await redis.redisClient.publish(availabilityChannel, JSON.stringify({ ticket: (req.reservedTicket).split('-')[1], user: req.body.sub }));
      // console.info(`[Cleanup Success] ${logMessage} Ticket ${req.reservedTicket} re-added to ${req.TICKET_RESERVATION_SET_KEY}`);
    } catch (err) {
      console.error(`[Cleanup Failure] ${logMessage} Redis error:`, err);
    }
  }
}

export default trackOutgoingResponse;
