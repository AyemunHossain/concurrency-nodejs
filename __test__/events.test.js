'use strict';

const eventController = require('../controllers/events.controller');
const eventsModel = require('../models/event.model');
const redis = require('../microservices/redis-connect').redisClient;
const redisSubscriber = require('../microservices/redis-connect').subscriber;
const redisPublisher = require('../microservices/redis-connect').publisher;

jest.mock('../models/event.model');
jest.mock('../microservices/redis-connect', () => ({
  redisClient: {
    del: jest.fn(),
    rPush: jest.fn(),
    lLen: jest.fn(),
    multi: jest.fn(() => ({
      lLen: jest.fn(),
      lPop: jest.fn(),
      rPush: jest.fn(),
      exec: jest.fn().mockResolvedValue(0),
    })),
  },
  subscriber: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  publisher: {
    publish: jest.fn(),
  },
}));

describe('Event Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: { sub: 'user-id-123' },
      query: {}
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event and populate tickets in Redis', async () => {
      eventsModel.createEvent.mockResolvedValue({ id: 'event-id-123' });
      eventsModel.createTickets.mockResolvedValue(true);
      redis.del.mockResolvedValue(true);
      redis.rPush.mockResolvedValue(true);

      req.body = { max_capacity: 3 };

      await eventController.createEvent(req, res);

      expect(eventsModel.createEvent).toHaveBeenCalledWith({
        ...req.body,
        user_id: req.user.sub,
      });
      expect(eventsModel.createTickets).toHaveBeenCalledWith(3, 'event-id-123');
      expect(redis.del).toHaveBeenCalledTimes(4); // Deleting Redis keys
      expect(redis.rPush).toHaveBeenCalledTimes(6); // Populating tickets
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'event-id-123' });
    });

    it('should handle errors and return 500 status', async () => {
      eventsModel.createEvent.mockRejectedValue(new Error('Database error'));

      await eventController.createEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('getTicket', () => {
    it('should return ticket details if found', async () => {
      eventsModel.getTicket.mockResolvedValue({ id: 'ticket-id-123' });

      req.query.id = 'ticket-id-123';
      await eventController.getTicket(req, res);

      expect(eventsModel.getTicket).toHaveBeenCalledWith('ticket-id-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: 'ticket-id-123' });
    });

    it('should return 500 status if ticket retrieval fails', async () => {
      eventsModel.getTicket.mockRejectedValue(new Error('Database error'));

      req.query.id = 'ticket-id-123';
      await eventController.getTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

});
