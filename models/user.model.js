import mysql from "../microservices/mysql-connect.js";

const checkIfEmailExist = async (email) => {
  try {
    const connection = await new Promise((resolve, reject) => {
      mysql.getConnection("MASTER", (err, conn) => {
        if (err) {
          console.error("Database connection failed:", err.stack);
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    try {
      const result = await new Promise((resolve, reject) => {
        connection.query(
          "SELECT id FROM users WHERE email = ? LIMIT 1",
          [email],
          (err, result) => {
            if (err) {
              console.error("Error occurred while checking user:", err.stack);
              reject(err);
            } else {
              resolve(result[0]);
            }
          }
        );
      });
      return result ? result.id : null;
    } catch (err) {
      //console.log({ checkIfEmailExist: err });
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    //console.log({ checkIfEmailExist: err });
    throw err;
  }
}

const getUserDetails = async (email) => {
  try {
    const connection = await new Promise((resolve, reject) => {
      mysql.getConnection("MASTER", (err, conn) => {
        if (err) {
          console.error("Database connection failed:", err.stack);
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    try {
      const result = await new Promise((resolve, reject) => {
        connection.query(
          "SELECT * FROM users WHERE email = ? LIMIT 1",
          [email],
          (err, result) => {
            if (err) {
              console.error("Error occurred while checking user:", err.stack);
              reject(err);
            } else {
              resolve(result[0]);
            }
          }
        );
      });
      return result;
    } catch (err) {
      //console.log({ getUserDetails: err });
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    //console.log({ getUserDetails: err });
    throw err;
  }
};


const createUser = async (bodyData) => {
  try {
    const connection = await new Promise((resolve, reject) => {
      mysql.getConnection("MASTER", (err, conn) => {
        if (err) {
          console.error("Database connection failed:", err.stack);
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    try {
      const result = await new Promise((resolve, reject) => {
        connection.query(
          "INSERT INTO users (full_name, email,role, hash, salt) VALUES (?, ?, ?, ?, ?)",
          [bodyData.full_name, bodyData.email,'user', bodyData.hash, bodyData.salt],
          (err, result) => {
            if (err) {
              console.error("Error occurred while creating user:", err.stack);
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });

      if(result.insertId){
        return {
          id: result.insertId,
          full_name: bodyData.full_name,
          email: bodyData.email,
          role: 'user'
        }
      }
      return false;
      
    } catch (err) {
      //console.log({ createUser: err });
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    //console.log({ createUser: err });
    throw err;
  }
};


const createAdminUser = async (bodyData) => {
  try {
    const connection = await new Promise((resolve, reject) => {
      mysql.getConnection("MASTER", (err, conn) => {
        if (err) {
          console.error("Database connection failed:", err.stack);
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    try {
      const result = await new Promise((resolve, reject) => {
        connection.query(
          "INSERT INTO users (full_name, email,role, hash, salt) VALUES (?, ?, ?, ?)",
          [bodyData.full_name, bodyData.email,'admin', bodyData.hash, bodyData.salt],
          (err, result) => {
            if (err) {
              console.error("Error occurred while creating user:", err.stack);
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });
      return result;
    } catch (err) {
      //console.log({ createAdminUser: err });
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    //console.log({ createAdminUser: err });
    throw err;
  }
};

export default {
  getUserDetails,
  createUser,
  createAdminUser,
  checkIfEmailExist
};

