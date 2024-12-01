import mysql from "../microservices/mysql-connect.js";

const createEvent = async (data) => {
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
          "INSERT INTO events (title, description, max_capacity, created_by) VALUES (?, ?, ?, ?)",
          [data.title, data.description, data.max_capacity, data.user_id],
          (err, result) => {
            if (err) {
              console.error("Error occurred while creating event:", err.stack);
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });

      if (result.insertId) {
        return {
          id: result.insertId,
          title: data.title,
          description: data.description,
          max_capacity: data.max_capacity,
          created_by: data.user_id
        };
      }
      return false;

    } catch (err) {
      console.log({ createEvent: err });
      throw err;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.log({ checkIfEmailExist: err });
    throw err;
  }
};

export default createEvent;