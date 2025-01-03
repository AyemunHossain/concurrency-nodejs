'use strict';
import UserModel from '../models/user.model.js';

async function checkUserWithEmail(email) {
  const isUser = await UserModel.checkIfEmailExist(email);
  return isUser ? true : false;
}

async function getUserDetails(email) {
  const user = await UserModel.getUserDetails(email);
  return user;
}

export default{
  checkUserWithEmail,
  getUserDetails, //Expose Critical Data
};