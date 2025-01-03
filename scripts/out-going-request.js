// Improved Middleware for Tracking Outgoing Response
import redis from "../microservices/redis-connect.js";


// Centralized Reservation Cleanup Function
async function handleReservationCleanup() {

      // await redis.redisClient
      //   .sAdd("tickets_reservation:101-list", "ticket_reserve-39590");
      // //Publish ticket available
      // const availabilityChannel = `ticket:availability:ticket_reserve-39590`;
      // //Send user notification
      // await redis.redisClient.publish(availabilityChannel, JSON.stringify({ticket: 39590, user: 1}));

      // const notificationChannel = `user:all:notification:101`;
      // await redis.redisClient.publish(notificationChannel, "Sold out for event 101");

      // ticket:notification:${ticketId}
      // const ticketNotificationChannel = `ticket:notification:39590`;
      // await redis.redisClient.publish(ticketNotificationChannel, "Sold out for ticket 39590");
}


(async()=>{
  await handleReservationCleanup();
})();