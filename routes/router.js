import express from 'express';
import eventsController from '../controllers/events.controller.js';
import validation from '../middlewares/model-validation.js';
import eventValidator from '../validators/events.model.validation.js';
import userValidator from '../validators/user.model.validation.js';
import userController from '../controllers/user.controller.js';
import userAuthenticationCheck from '../middlewares/authentication.js';
import trackOutGoingResponse from '../middlewares/out-going-request.js';

const router = express.Router();

// User Routes
router.post('/user/register', validation.bodyValidator(userValidator.userRegistration), userController.userRegistrationDefault);
router.post('/user/login', validation.bodyValidator(userValidator.userLogin), userController.userLoginDefault);

router.post('/create-event', userAuthenticationCheck, validation.bodyValidator(eventValidator.createEvent), eventsController.createEvent);
router.get('/get-event-tickets', userAuthenticationCheck, validation.queryValidator(eventValidator.getTicket), eventsController.getTicket);
router.post('/purchase-ticket', userAuthenticationCheck, validation.bodyValidator(eventValidator.purchaseTicket), trackOutGoingResponse, eventsController.purchaseTicket);

export default router;