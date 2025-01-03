'use strict';
import userUtils from '../utils/user.utils.js';
import passwordUtils from '../utils/password.utils.js';
import UserModel from '../models/user.model.js';

const userRegistrationDefault = async (req, res, next) => {

  try {
    const { full_name, email, password } = req.body;
    const userExists = await userUtils.checkUserWithEmail(email);

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: `A user with this details is already registered!`,
        error: false,
      });
    }

    ///User registration logic here
    const saltHash = passwordUtils.genPassword(password);
    const { salt, hash } = saltHash;

    const bodyData = {
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      salt: salt,
      hash: hash
    };

    const newUser = await UserModel.createUser(bodyData);
    const { accessToken, refreshToken } = passwordUtils.issueJWT(newUser);

    return res.status(200).json({
      message: 'Registration Success.',
      success: true,
      accessToken: accessToken,
      refreshToken: refreshToken,
    })


  } catch (err) {
    return res.status(417).send({
      success: false,
      message: 'Something went wrong, please try again later.',
      error: true,
      errorMessage: err.message
    })
  }
}

const userLoginDefault = async (req, res, next) => {

  try {
    const { email, password } = req.body;
    const userDetails = await userUtils.getUserDetails(email);

    if (!userDetails) {
      return res.status(200).json({
        success: false,
        message: `A user with these details is not found`,
        error: false,
      });
    }
    else {

      //console.log({ userDetails })
      ///User signin logic here
      const isValid = await passwordUtils.validatePassword(password, userDetails.hash, userDetails.salt);

      if (isValid) {
        const { accessToken, refreshToken } = passwordUtils.issueJWT(userDetails);
        res.status(200).json({
          message: 'Login Success.',
          success: true,
          accessToken: accessToken,
          refreshToken: refreshToken,
        })
      } else {
        return res.status(200).json({
          success: false,
          message: `Your password is incorrect, please try again with a correct password!`,
          error: false,
        });
      }
    }

  } catch (err) {
    return res.status(417).send({
      success: false,
      message: 'Something went wrong, please try again later.',
      error: true,
      errorMessage: err.message
    })
  }
}


export default{
  userRegistrationDefault,
  userLoginDefault
}

