'use strict';
import crypto from 'crypto';
import jsonwebtoken from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToPrivateKey = path.join(__dirname, "../utils/keys/", "id_rsa_priv.pem");
const pathToPublicKey = path.join(__dirname, "../utils/keys/", "id_rsa_pub.pem");
const pathToAdminPrivateKey = path.join(__dirname, "../utils/keys/", "admin_id_rsa_priv.pem");
const pathToAdminPublicKey = path.join(__dirname, "../utils/keys/", "admin_id_rsa_pub.pem");

const ADMIN_PRIV_KEY = fs.readFileSync(pathToAdminPrivateKey, "utf8");
const ADMIN_PUB_KEY = fs.readFileSync(pathToAdminPublicKey, "utf8");
const PRIV_KEY = fs.readFileSync(pathToPrivateKey, "utf8");
const PUB_KEY = fs.readFileSync(pathToPublicKey, "utf8");

/**

/**
 *
 * @param {*} password - The password string that the user inputs to the password field in the register form
 *
 */

function genPassword(password) {
  try {
    var salt = crypto.randomBytes(64).toString("hex");

    var genHash = crypto
      .pbkdf2Sync(password, salt, 10000, 128, "sha512")
      .toString("hex");

    return {
      salt: salt,
      hash: genHash,
    };
  } catch (err) {
    console.error({ "genPassword Error": err });
    err.statusCode = 401;
    err.message = "Invalid Input";
    throw err;
  }
}

function genAdminPassword(password) {
  try {
    var salt = crypto.randomBytes(256).toString("hex");
    var genHash = crypto
      .pbkdf2Sync(password, salt, 10000, 256, "sha512")
      .toString("hex");

    return {
      salt: salt,
      hash: genHash,
    };
  } catch (err) {
    console.error({ "genAdminPassword Error": err });
    err.statusCode = 401;
    err.message = "Invalid Input";
    throw err;
  }
}

/**
 *
 * @param {*} password - The plain text password
 * @param {*} hash - The hash stored in the database
 * @param {*} salt - The salt stored in the database
 */
function validatePassword(password, hash, salt) {
  //console.log({password, hash, salt})
  try {
    var hashVerify = crypto
      .pbkdf2Sync(password, salt, 10000, 128, "sha512")
      .toString("hex");
    return hash === hashVerify;
  } catch (err) {
    console.error({ "validatePassword Error": err });

    err.statusCode = 401;
    err.message = "Invalid Input";
    throw err;
  }
}

function validateAdminPassword(password, hash, salt) {
  try {
    var hashVerify = crypto
      .pbkdf2Sync(password, salt, 10000, 256, "sha512")
      .toString("hex");
    return hash === hashVerify;
  } catch (err) {
    console.error({ "validateAdminPassword Error": err });

    err.statusCode = 401;
    err.message = "Invalid Input";
    throw err;
  }
}

// Issue JWT
function issueJWT(user) {
  try {
    const id = user.id;
    const expiresIn = "6h";
    const refreshExpiresIn = "30d";
    const payload = {
      sub: id,
      role: user.role ,
      email: user.email,
      full_name: user.full_name,
    };

    const accessToken = jsonwebtoken.sign({ ...payload, type: "access-token" }, PRIV_KEY, {
      expiresIn: expiresIn,
      algorithm: "PS512",
    });

    const refreshToken = jsonwebtoken.sign({ ...payload, type: "refresh-token" }, PRIV_KEY, {
      expiresIn: refreshExpiresIn,
      algorithm: "PS512",
    });

    return {
      accessToken: { accessToken, expires: expiresIn },
      refreshToken: { refreshToken, expires: refreshExpiresIn },
    };
  } catch (err) {
    console.error({ "issueJWT Error": err });

    err.statusCode = 401;
    err.message = "Invalid Input";
    throw err;
  }
}

function issueAdminJWT(admin) {
  const id = admin.id;
  const expiresIn = "1d";
  const refreshExpiresIn = "7d";

  const payload = {
    sub: id,
    role: admin.role,
    permission: admin.permission,
    email: admin.email,
    adminname: admin.userName,
  };

  const accessToken = jsonwebtoken.sign(payload, ADMIN_PRIV_KEY, {
    expiresIn: expiresIn,
    algorithm: "PS512",
  });

  const refreshToken = jsonwebtoken.sign(payload, ADMIN_PRIV_KEY, {
    expiresIn: refreshExpiresIn,
    algorithm: "PS512",
  });

  //Here save the refresh token to the database [need_to_develop] https://dev.to/cyberwolves/jwt-authentication-with-access-tokens-refresh-tokens-in-node-js-5aa9

  return {
    accessToken: { accessToken, expires: expiresIn },
    refreshToken: { refreshToken, expires: refreshExpiresIn },
  };
}

function decodeJWT(token) {
  try {
    const decoded = jsonwebtoken.verify(token, PUB_KEY, { algorithm: "PS512" });
    return decoded;
  } catch (err) {
    console.error({ "decodeJWT Error": err });

    err.statusCode = 401;
    err.message = "Invalid Input";
    throw err;
  }
}

function decodeAdminJWT(token) {
  try {
    const decoded = jsonwebtoken.verify(token, ADMIN_PUB_KEY, {
      algorithm: "PS512",
    });
    return decoded;
  } catch (err) {
    console.error({ "decodeAdminJWT Error": err });

    err.statusCode = 401;
    err.message = "Invalid Input";
    throw err;
  }
}

function checkDamnVulnerablePass(password, name, email, address, phone) {
  password.includes(name) ||
    password.includes(email) ||
    password.includes(address) ||
    password.includes(phone)
    ? true
    : false;
}

function verifyRefreshToken(refreshToken) {
  try {
    const decodedToken = jsonwebtoken.verify(refreshToken, PUB_KEY, {
      algorithm: "PS512",
    });
    return decodedToken;
  } catch (err) {
    console.error({ "verifyRefreshToken Error": err });

    err.statusCode = 500;
    err.message = "Please try again later";
    throw err;
  }
}

function verifyAdminRefreshToken(refreshToken) {
  try {
    const decodedToken = jsonwebtoken.verify(refreshToken, ADMIN_PUB_KEY, {
      algorithm: "PS512",
    });
    return decodedToken;
  } catch (err) {
    console.error({ "verifyAdminRefreshToken Error": err });

    err.statusCode = 500;
    err.message = "Please try again later";
    throw err;
  }
}

function verifyAccessToken(accessToken) {
  try {
    const decodedToken = jsonwebtoken.verify(accessToken, PUB_KEY, {
      algorithm: "PS512",
    });
    return decodedToken;
  } catch (err) {
    console.error({ "verifyAccessToken Error": err });

    err.statusCode = 500;
    err.message = "Please try again later";
    throw err;
  }
}

function verifyAdminAccessToken(accessToken) {
  try {
    const decodedToken = jsonwebtoken.verify(accessToken, ADMIN_PUB_KEY, {
      algorithm: "PS512",
    });
    return decodedToken;
  } catch (err) {
    console.error({ "verifyAdminAccessToken Error": err });

    err.statusCode = 500;
    err.message = "Please try again later";
    throw err;
  }
}

function issueResetJWT(user) {
  try {
    const expiresIn = "1d";
    const payload = {
      sub: user.id,
      iat: Date.now,
      email: user.email,
      username: user.username
    };

    const generatedToken = jsonwebtoken.sign(payload, RESET_PASSWORD_PRIV_KEY, {
      expiresIn: expiresIn,
      algorithm: "PS512",
    });

    return generatedToken;
  } catch (err) {
    console.error({ "issueResetJWT Error": err });

    err.statusCode = 500;
    err.message = "Please try again later";
    throw err;
  }
}


export default {
  validatePassword,
  genPassword,
  issueJWT,
  decodeJWT,
  checkDamnVulnerablePass,
  verifyRefreshToken,
  verifyAccessToken,
  validateAdminPassword,
  genAdminPassword,
  issueAdminJWT,
  decodeAdminJWT,
  verifyAdminRefreshToken,
  verifyAdminAccessToken,
  issueResetJWT
};
