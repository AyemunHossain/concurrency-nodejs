import Joi from 'joi';

const createEvent = Joi.object({
  title: Joi.string().min(3).max(30).required(),
  description: Joi.string().min(3).max(30).required(),
  max_capacity: Joi.number().required(),
});

const getTicket = Joi.object({
  id: Joi.number().required()
});

const purchaseTicket = Joi.object({
  id: Joi.number().required(),
  ticket_id: Joi.number().required(),
  user_id: Joi.number().required()
});

export default {
  createEvent,
  getTicket,
  purchaseTicket
};