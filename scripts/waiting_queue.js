'use strict';
import redis from "../microservices/redis-connect.js";
redis.subscriber.setMaxListeners(200);


const purchaseTicket = async (req) => {
  try {
    const { id, ticket_id } = req.body; // Event ID
    const userId = req.body.user_id;

    console.log("------------------------", id, ticket_id, userId)
    const TICKET_RESERVATION_SET_KEY = `tickets_reservation:${id}-list`;
    const WAITING_QUEUE_KEY = `users-waiting:${id}-list`;
    const TICKET_SET_KEY = `tickets:${id}-list`;

    // Check if tickets are sold out
    const ticketsLeft = await redis.redisClient.sCard(TICKET_SET_KEY);
    if (ticketsLeft === 0) {
      return { status: false, message: "Tickets are sold out." };
    }

    // Add user to the waiting queue if no reservations exist
    const reservationListLength = await redis.redisClient.sCard(TICKET_RESERVATION_SET_KEY);
    if (reservationListLength === 0) {

      const alreadyInQueue = await redis.redisClient.lPos(WAITING_QUEUE_KEY, String(userId));

      if (alreadyInQueue === null) {
        await redis.redisClient.rPush(WAITING_QUEUE_KEY, String(userId));
      }

      const result = await handleWaitingQueue(userId, id, ticket_id);
      return result.data;
    }

    // Direct ticket purchase attempt
    const { purchased, ticket, reason, waiting } = await purchaseTicketMYS(userId, id, ticket_id);
    console.log({ purchased, ticket, reason, waiting })
    if (purchased) {
      return { status: true, message: `Ticket purchased successfully. ${ticket}` };
    } else {

      if (waiting) {
        const alreadyInQueue = await redis.redisClient.lPos(WAITING_QUEUE_KEY, String(userId));
        if (alreadyInQueue === null) {
          await redis.redisClient.rPush(WAITING_QUEUE_KEY, String(userId));
        }
        const result = await handleWaitingQueue(userId, id, ticket_id);
        return result.data;
      }

      return { message: reason };
    }
  } catch (err) {
    console.error("Error purchasing ticket:", err);
    return false;
  }
};


async function handleWaitingQueue(userId, eventId, ticketId) {
  return new Promise((resolve, reject) => {

    let responseSent = false;
    const timeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        cleanup();
        resolve({
          status: 200,
          data: { message: "Waiting timeout, Please Try again." },
        });
      }
    }, 30000); // 30 seconds timeout

    const eventnotificationChannel = `user:all:notification:${eventId}`;
    const availabilityChannel = `ticket:availability:ticket_reserve-${ticketId}`;
    const ticketNotificationChannel = `ticket:notification:${ticketId}`;
    // const availabilityChannel = `ticket:availability`;

    const cleanup = () => {
      clearTimeout(timeout);
      redis.subscriber.unsubscribe(eventnotificationChannel);
      redis.subscriber.unsubscribe(availabilityChannel);
      redis.subscriber.unsubscribe(ticketNotificationChannel);
    };

    redis.subscriber.subscribe(eventnotificationChannel, (message) => {
      console.log("Subscribed to notification channel:", message);
      if (message) {
        responseSent = true;
        cleanup();
        reject({ status: 500, data: { message: 'All Ticket Soldout' }});
      }
    });

    redis.subscriber.subscribe(ticketNotificationChannel, (message) => {
      console.log("Subscribed to ticket notification channel:", message);
      if (message) {
        responseSent = true;
        cleanup();
        resolve({ status: 200, data: { message: 'Ticket Sold' } });
      }
    });

    redis.subscriber.subscribe(availabilityChannel, async (message) => {
      console.log("Subscribed to availability channel:", message);
      const {ticket, user} = JSON.parse(message);
      if(ticket === ticketId && user === userId){
        const purchase = await purchaseTicketMYS(userId, eventId, ticketId);
        responseSent = true;
        cleanup();
        resolve({
          status: purchase ? 200 : 500,
          data: { message: purchase ? `Ticket purchased successfully: ${ticket}` : 'Ticket purchase failed. Try again.' },
        });
      }
    });

    // redis.subscriber.subscribe(availabilityChannel,(message)=>{
    //   console.log("Subscribed to availability channel:", message);
    // });


  });
}

async function purchaseTicketMYS(userId, eventId, ticketId) {
  const TICKET_RESERVATION_SET_KEY = `tickets_reservation:${eventId}-list`;
  const TICKET_SET_KEY = `tickets:${eventId}-list`;

  try {
    const reservedTicket = await reserveTicket(userId, TICKET_RESERVATION_SET_KEY, ticketId);
    if (!reservedTicket) {
      return { purchased: false, ticket: null, reason: "Need to wait...", waiting: true };
    }

    const availableTickets = await redis.redisClient.sIsMember(TICKET_SET_KEY, `ticket-${ticketId}`);
    if (!availableTickets) {
      await redis.publisher.publish('ticket:solout', `${eventId}-${ticketId}`);
      await redis.redisClient.del(TICKET_RESERVATION_SET_KEY);
      return { purchased: false, ticket: null, reason: "Tickets are sold out.", waiting: false };
    }

    //80% chance of payment success
    const paymentSuccess = Math.random() < 0.1;
    const result = await processPayment(userId, ticketId, eventId, paymentSuccess);
    if (result) {
      return { purchased: true, ticket: ticketId, reason: null, waiting: false };
    }

    return { purchased: false, reason: "Payment Failed", waiting: false };
  } catch (err) {
    console.error("Error during ticket purchase:", err);
    return false;
  }
}

async function reserveTicket(userId, reservationListKey, ticketId) {
  console.log("Reserving ticket:", ticketId);
  const result = await redis.redisClient.sRem(reservationListKey, `ticket_reserve-${ticketId}`);
  console.log("Result:", result);

  return result === 1 ? `ticket_reserve-${ticketId}` : null;
}

async function processPayment(userId, ticketId, eventId, paymentSuccess) {
  const reservationListKey = `tickets_reservation:${ticketId}-list`;
  const reservationKey = `ticket_reserve-${ticketId}`;
  const ticketListKey = `tickets:${eventId}-list`;

  if (paymentSuccess) {
    await redis.redisClient.sRem(reservationListKey, reservationKey);
    await redis.redisClient.sRem(ticketListKey, `ticket-${ticketId}`);
    //console.log(`Payment completed for ticket ${ticketId}.`);
    return ticketId;
  } else {
    //console.log(`Payment failed or timed out for ticket ${ticketId}.`);
    return false;
  }
}

(async () => {
  const val = await purchaseTicket({ body: { id: 101, ticket_id: 39591, user_id: 1 } });
  console.log(val);
})();

// {
//   "id": 39589,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39590,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39591,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39592,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39593,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39594,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39595,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39596,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39597,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// },
// {
//   "id": 39598,
//   "event_id": "101",
//   "status": 0,
//   "booked_by": null
// }