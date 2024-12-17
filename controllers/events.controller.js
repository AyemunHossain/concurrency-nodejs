'use strict';
import eventsModel from '../models/event.model.js';
import redis from "../microservices/redis-connect.js";
import eventModel from '../models/event.model.js';

const createEvent = async (req, res) => {
  try {
    const user_id = req.user.sub;
    const result = await eventsModel.createEvent({ ...req.body, user_id });
    const totalTickets = req.body.max_capacity;
    const ticketReservationPromises = [];
    const ticketListPromises = [];

    if (result) {

      await eventsModel.createTickets(totalTickets, result.id);
      var getTiketIds = await eventModel.getTiketIds(result.id);
      getTiketIds = getTiketIds.map((ticket) => ticket.id);

      const TICKET_RESERVATION_SET_KEY = `tickets_reservation:${result.id}-list`;
      const TICKET_SET_KEY = `tickets:${result.id}-list`;
      const WAITING_QUEUE_KEY = `users-waiting:${result.id}-list`;
      const NOTIFIED_KEY = `users-notified:${result.id}-list`;

      await Promise.all([
        redis.redisClient.del(TICKET_RESERVATION_SET_KEY),
        redis.redisClient.del(WAITING_QUEUE_KEY),
        redis.redisClient.del(TICKET_SET_KEY),
        redis.redisClient.del(NOTIFIED_KEY)
      ]);

      // Populate tickets
      for (let i = 0; i < getTiketIds.length; i++) {
        ticketReservationPromises.push(redis.redisClient.sAdd(TICKET_RESERVATION_SET_KEY, `ticket_reserve-${getTiketIds[i]}`));
        ticketListPromises.push(redis.redisClient.sAdd(TICKET_SET_KEY, `ticket-${getTiketIds[i]}`));
      }
      await Promise.all([...ticketReservationPromises, ...ticketListPromises]);

      return res.status(201).json(result);
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  } catch (err) {
    console.error({ createEvent: err });
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getTicket = async (req, res) => {
  try {
    const { id } = req.query;
    //console.log({ id });

    const result = await eventsModel.getTicket(id);
    if (result) {
      return res.status(200).json(result);
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  } catch (err) {
    console.error({ getTicket: err });
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Improved Ticket Purchasing System with Concurrency Management
const purchaseTicket = async (req, res) => {
  try {
    const { id, ticket_id } = req.body; // Event ID
    const userId = req.user.sub;

    const TICKET_RESERVATION_SET_KEY = `tickets_reservation:${id}-list`;
    const WAITING_QUEUE_KEY = `users-waiting:${id}-list`;
    const TICKET_SET_KEY = `tickets:${id}-list`;

    // Check if tickets are sold out
    const ticketsLeft = await redis.redisClient.sCard(TICKET_SET_KEY);
    if (ticketsLeft === 0) {
      return res.status(400).json({ message: "Tickets are sold out." });
    }

    // Add user to the waiting queue if no reservations exist
    const reservationListLength = await redis.redisClient.sCard(TICKET_RESERVATION_SET_KEY);
    if (reservationListLength === 0) {
      const alreadyInQueue = await redis.redisClient.lPos(WAITING_QUEUE_KEY, String(userId));
      if (alreadyInQueue === null) {
        await redis.redisClient.rPush(WAITING_QUEUE_KEY, String(userId));
      }

      const result = await handleWaitingQueue(userId, id, ticket_id, req);
      return res.status(result.status).json(result.data);
    }

    // Direct ticket purchase attempt
    const { purchased, ticket, reason, waiting } = await purchaseTicketMYS(req, userId, id, ticket_id);
    if (purchased) {
      return res.status(200).json({ message: `Ticket purchased successfully. ${ticket}` });
    } else {

      if(waiting){
        const alreadyInQueue = await redis.redisClient.lPos(WAITING_QUEUE_KEY, String(userId));
        if (alreadyInQueue === null) {
          await redis.redisClient.rPush(WAITING_QUEUE_KEY, String(userId));
        }
        const result = await handleWaitingQueue(userId, id, ticket_id, req);
        return res.status(result.status).json(result.data);
      }
      
      return res.status(500).json({ message: reason });
    }
  } catch (err) {
    console.error("Error purchasing ticket:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

async function handleWaitingQueue(userId, eventId, ticketId, req) {
  return new Promise((resolve) => {
    let responseSent = false;

    const timeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        resolve({
          status: 200,
          data: { message: "Please Try again." },
        });
      }
    }, 30000); // 30 seconds timeout

    const notificationChannel = `user:${userId}:notification`;
    const availabilityChannel = `ticket:availability:${ticketId}`;

    const unsubscribe = () => {
      redis.subscriber.unsubscribe(notificationChannel);
      redis.subscriber.unsubscribe(availabilityChannel);
    };

    redis.subscriber.subscribe(notificationChannel, (message) => {
      if (!responseSent) {
        responseSent = true;
        clearTimeout(timeout);
        unsubscribe();
        resolve({ status: 200, data: { message } });
      }
    });

    redis.subscriber.subscribe(availabilityChannel, async () => {
      if (!responseSent) {
        const nextUser = await redis.redisClient.lPop(WAITING_QUEUE_KEY);
        if (nextUser === userId) {
          const purchase = await purchaseTicketMYS(req, userId, eventId, ticketId);
          responseSent = true;
          unsubscribe();
          resolve({
            status: purchase ? 200 : 500,
            data: { message: purchase ? `Ticket purchased successfully: ${purchase}` : 'Ticket purchase failed. Try again.' },
          });
        }
      }
    });


  });
}

async function purchaseTicketMYS(req, userId, eventId, ticketId) {
  const TICKET_RESERVATION_SET_KEY = `tickets_reservation:${eventId}-list`;
  const TICKET_SET_KEY = `tickets:${eventId}-list`;

  try {
    const reservedTicket = await reserveTicket(userId, TICKET_RESERVATION_SET_KEY, ticketId);
    if (!reservedTicket) {

      return { purchased: false, ticket: null, reason: "Need to wait...", waiting: true };
    }

    req.is_reserve = true;
    req.TICKET_RESERVATION_SET_KEY = TICKET_RESERVATION_SET_KEY;
    req.reservedTicket = reservedTicket;

    const availableTickets = await redis.redisClient.sIsMember(TICKET_SET_KEY, `ticket-${ticketId}`);
    if (!availableTickets) {
      await redis.publisher.publish('ticket:solout', `${eventId}-${ticketId}`);
      await redis.redisClient.del(TICKET_RESERVATION_SET_KEY);
      return { purchased: false, ticket: null, reason: "Tickets are sold out.", waiting: false };
    }

    //80% chance of payment success
    const paymentSuccess = Math.random() > 0.2;
    const result = await processPayment(userId, ticketId, eventId, paymentSuccess);
    if (result) {
      req.is_reserve = false;
      req.TICKET_RESERVATION_SET_KEY = null;
      req.reservedTicket = null;
      return { purchased: true, ticket: ticketId, reason: null, waiting: false };
    }

    return { purchased: false, reason: "Payment Failed", waiting: false };
  } catch (err) {
    console.error("Error during ticket purchase:", err);
    return false;
  }
}

async function reserveTicket(userId, reservationListKey, ticketId) {
  const result = await redis.redisClient.sRem(reservationListKey, `ticket_reserve-${ticketId}`);
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



export default {
  createEvent,
  getTicket,
  purchaseTicket
}