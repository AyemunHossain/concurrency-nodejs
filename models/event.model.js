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
          created_by: data.user_id,
        };
      }
      return false;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error({ createEventError: err });
    throw err;
  }
};

const createTickets = async (numberOfSeats, eventId) => {
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
      const query = "INSERT INTO tickets (event_id) VALUES ?";
      const values = Array.from({ length: numberOfSeats }, () => [eventId]);

      const result = await new Promise((resolve, reject) => {
        connection.query(query, [values], (err, result) => {
          if (err) {
            console.error("Error occurred while creating seats:", err.stack);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      return { affectedRows: result };
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("createTickets Error:", err);
    throw err;
  }
};

const getTicket = async (eventId) => {
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
          "SELECT * FROM tickets WHERE event_id = ?",
          [eventId],
          (err, result) => {
            if (err) {
              console.error("Error occurred while fetching tickets:", err.stack);
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });

      return result;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("getTicket Error:", err);
    throw err;
  }
};

const getTiketIds = async (eventId) => {
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
          "SELECT id FROM tickets WHERE event_id = ?",
          [eventId],
          (err, result) => {
            if (err) {
              console.error("Error occurred while fetching tickets:", err.stack);
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      });

      return result;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("getTicket Error:", err);
    throw err;
  }
};


const purchasingTicket = async (data) => {
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
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) {
          console.error("Error starting transaction:", err.stack);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const result = await new Promise((resolve, reject) => {
      connection.query(
        "UPDATE tickets SET status = 1 WHERE event_id = ? AND id = ? AND status = 0",
        [data.event_id, data.ticket_id],
        (err, result) => {
          if (err) {
            console.error("Error occurred while purchasing ticket:", err.stack);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) {
          console.error("Error committing transaction:", err.stack);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return result.affectedRows;
  } catch (err) {
    await new Promise((resolve) => {
      connection.rollback(() => {
        console.error("Transaction rolled back due to error:", err.stack);
        resolve();
      });
    });
    throw err;
  } finally {
    connection.release();
  }
};

const checkAvailabilityOfTicket = async (eventId, ticketId) => {
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
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) {
          console.error("Error starting transaction:", err.stack);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const result = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT id FROM tickets WHERE event_id = ? AND id = ? AND status = 0 FOR UPDATE",
        [eventId, ticketId],
        (err, result) => {
          if (err) {
            console.error("Error occurred while checking ticket availability:", err.stack);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });

    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) {
          console.error("Error committing transaction:", err.stack);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return result;
  } catch (err) {
    await new Promise((resolve) => {
      connection.rollback(() => {
        console.error("Transaction rolled back due to error:", err.stack);
        resolve();
      });
    });
    throw err;
  } finally {
    connection.release();
  }
};

export default{
  createEvent,
  createTickets,
  getTicket,
  purchasingTicket,
  checkAvailabilityOfTicket,
  getTiketIds
}