'use strict';
import eventsModel from '../models/event.model.js';
import  redis from "../microservices/redis-connect.js";

const createEvent = async (req, res) => {
  try {
    const user_id = req.user.sub;
    const result = await eventsModel.createEvent({ ...req.body, user_id });
    const totalTickets = req.body.max_capacity;
    const ticketReservationPromises = [];
    const ticketListPromises = [];

    if (result) {

      await eventsModel.createTickets(totalTickets, result.id);
      const TICKET_RESERVATION_LIST_KEY = `tickets_reservation:${result.id}-list`;
      const TICKET_LIST_KEY = `tickets:${result.id}-list`;
      const WAITING_QUEUE_KEY = `users-waiting:${result.id}-list`;
      const NOTIFIED_KEY = `users-notified:${result.id}-list`;

      await Promise.all([
        redis.redisClient.del(TICKET_RESERVATION_LIST_KEY),
        redis.redisClient.del(WAITING_QUEUE_KEY),
        redis.redisClient.del(TICKET_LIST_KEY),
        redis.redisClient.del(NOTIFIED_KEY)
      ]);

      // Populate tickets
      for (let i = 1; i <= totalTickets; i++) {
        ticketReservationPromises.push(redis.redisClient.rPush(TICKET_RESERVATION_LIST_KEY, `ticket_reserve-${i}`));
        ticketListPromises.push(redis.redisClient.rPush(TICKET_LIST_KEY, `ticket-${i}`));
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
    console.log({ id });

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

const purchaseTicket = async (req, res) => {
  try {
    const { id, ticket_id } = req.body; // Event ID
    const userId = req.user.sub;

    const TICKET_RESERVATION_LIST_KEY = `tickets_reservation:${id}-list`;
    const WAITING_QUEUE_KEY = `users-waiting:${id}-list`;
    const TICKET_LIST_KEY = `tickets:${id}-list`;

    // Check if tickets are sold out
    const ticketsLeft = await redis.redisClient.multi().lLen(TICKET_LIST_KEY).exec();

    if (ticketsLeft === 0) {
      const waitingCount = await redis.redisClient.multi().lLen(WAITING_QUEUE_KEY).exec();
      if (waitingCount > 0) {

      }
      return res.status(400).json({ message: "Tickets are sold out." });
    }

    const resurvationListLength = await redis.redisClient.multi().lLen(TICKET_RESERVATION_LIST_KEY).exec();

    if (resurvationListLength === 0) {
      await redis.redisClient.multi().rPush(WAITING_QUEUE_KEY, userId.toString()).exec();

      await new Promise((resolve, reject) => {
        let responseSent = false;

        const timeout = setTimeout(() => {
          if (!responseSent) {
            responseSent = true;
            resolve({
              status: 200,
              data: { message: "Tickets are sold out. You did not get a ticket." },
            });
          }
        }, 30000); // 30 seconds timeout

        redis.subscriber.subscribe(`user:${userId}:notification`, (message) => {
          if (!responseSent) {
            responseSent = true;
            clearTimeout(timeout);
            redis.subscriber.unsubscribe(`user:${userId}:notification`);
            redis.subscriber.unsubscribe("ticket:availability");
            resolve({
              status: 200,
              data: { message: message },
            });
          }
        });

        redis.subscriber.subscribe("ticket:availability", async (message) => {
          if (!responseSent) {
            const nextUser = await redis.redisClient.multi().lPop(WAITING_QUEUE_KEY).exec();
            console.log({ nextUser, id });
            if (nextUser) {
              try {
                const purchase = await purchaseTicketMYS(req, nextUser, id, ticket_id); // Attempt to process the next waiting user
                if (purchase) {
                  if (!responseSent) {
                    responseSent = true;
                    redis.subscriber.unsubscribe(`user:${userId}:notification`);
                    redis.subscriber.unsubscribe("ticket:availability");
                    return res.status(200).json({ message: `Ticket purchased successfully. ${purchase}` });
                  }
                } else {
                  if (!responseSent) {
                    responseSent = true;
                    redis.subscriber.unsubscribe(`user:${userId}:notification`);
                    redis.subscriber.unsubscribe("ticket:availability");
                    return res.status(500).json({ message: 'Ticket purchase failed. Please try again.' });
                  }
                }
              } catch (err) {
                if (!responseSent) {
                  responseSent = true;
                  redis.subscriber.unsubscribe(`user:${userId}:notification`);
                  redis.subscriber.unsubscribe("ticket:availability");
                  return res.status(500).json({ message: 'Ticket purchase failed. Please try again.' });
                }
              }
            }
          }
        });

        redis.publisher.subscribe("ticket:solout", async (message) => {
          const soloutEventId = message.split('-')[0];
          const soloutTicketId = message.split('-')[1];
          if (soloutEventId == id && soloutTicketId == ticket_id) {
            if (!responseSent) {
              responseSent = true;
              clearTimeout(timeout);
              redis.subscriber.unsubscribe(`user:${userId}:notification`);
              redis.subscriber.unsubscribe("ticket:availability");
              return res.status(200).json({ message: "Tickets are sold out. You did not get a ticket." });
            }
          }
        });

      }).then((result) => {
        if (!responseSent) {
          responseSent = true;
          return res.status(result.status).json(result.data);
        }
      });
    }

    // console.log({userId, id, ticket_id})
    const purchase = await purchaseTicketMYS(req, userId, id, ticket_id)
    if (purchase) {
      return res.status(200).json({ message: `Ticket purchased successfully. ${purchase}` });
    } else {
      return res.status(500).json({ message: 'Ticket purchase failed. Please try again.' });
    }

  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

async function purchaseTicketMYS(req, userId, eventId, ticketId) {

  const TICKET_RESERVATION_LIST_KEY = `tickets_reservation:${eventId}-list`;
  const TICKET_LIST_KEY = `tickets:${eventId}-list`;
  const reservedTicket = await reserveTicket(userId, TICKET_RESERVATION_LIST_KEY);

  try {
    if (reservedTicket) {
      req.is_reserve = true;
      req.TICKET_RESERVATION_LIST_KEY = TICKET_RESERVATION_LIST_KEY;
      req.reservedTicket = reservedTicket;

      const availableTickets = await eventsModel.checkAvailabilityOfTicket(eventId, ticketId);

      if (!availableTickets.length) {
        await redis.publisher.publish('ticket:solout', `${eventId}-${ticketId}`);
        return false;
      }

      if (availableTickets) {
        const result = await eventsModel.purchasingTicket({ event_id: eventId, ticket_id: ticketId });

        if (result) {
          await redis.redisClient.multi().lPop(TICKET_LIST_KEY).exec();
          req.is_reserve = false;
          return ticketId;
        }

        await redis.publisher.publish('ticket:solout', `${eventId}-${ticketId}`);
        return false;
      }
    }else return false;
  } catch (err) {
    return false;
  }

  return false;
}

// Reserve a ticket for the user
async function reserveTicket(userId, reservationListKey) {
  const ticket = await redis.redisClient.multi().lPop(reservationListKey).exec();
  return ticket && ticket[0] ? ticket[0] : null;
}

export default {
  createEvent,
  getTicket,
  purchaseTicket
}