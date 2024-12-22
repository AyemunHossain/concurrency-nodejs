import axios from "axios";
import pLimit from "p-limit";
import { Worker } from "worker_threads";

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 20000; // Total number of simulated users
const CONCURRENCY_LIMIT = 2000; // Number of concurrent requests
const RETRY_LIMIT = 1; // Number of retries for failed requests
var ticket_id = 0;

// Initialize the logging worker
const logWorker = new Worker("./utils/loggerWorker.js");

// Function to log messages using the worker
const log = (level, message) => {
  logWorker.postMessage({ level, message });
};

// Function to simulate a single user purchase request
const simulateUserRequest = async (reqId, ticket_id, retryCount = 0) => {
  try {
    const response = await axios.post(
      API_URL,
      { id: 90, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczNDg5NDI5NiwiZXhwIjoxNzM0OTE1ODk2fQ.ytkZsvL9e7eIMc3TfQcVYidFUayXGqRsWVt6S2UKW079_4W5QPv0_-5quD9SsRjwSgfO97wR_vaxltRXfXftePklP300Eu8m8ngnKBbzKd7ASW7VoL7oJi0sue5RBKSoMNhGNv9mrAj9pXmnzN9_Tes1QXS4GNTN7Wc7CnQ8GkCiErpjEjwfDkQL_KJ97QL2_6mSf4QVVSHdaFCxuTlasmPGKdvf6CjNFy04KaymoruRZzNkQcYb25NoWsf657r6ZIQa72XEMtp5jxrot6aeaDwFXOf0SFesvbkPlKyoUeIgutSDC4Ees71-Z6hW7doKK6uq-1fBMgKk-Usos5H1e8NJDzWHiogHT41kU88EygInb5cHn9EQWzjBAMZA9lslNr__4w7mWBy6OBcB5GZbZEE_M2YVEy3qIjWzd2RgxChWqu0rrW2f36uN12q4Qxhbel_QqlcnC_phfZ3yCwNar8Wyl9ls902j02RSPaLAYGARgxoJmA-hOxh-Uz3Ci8i0_6CplDxh8EYfNl4kiAJY53yBlZB-GMp3GS1GLXHfsX5NRS6LG8QWlm-OGtgKdwKp5OxwWn7VJxOUV7d0gVKkvmlCd74_LOHIHHJtFViT-i0yNNvsZKIVCDwvpakfxaSylkoe9-O0l1vZtPvsjGFmudW0yg81Hsh5qKOtVjnJ4BM"
        }
      }
    );

    log("info", `User ${reqId}: ${JSON.stringify(response.data)}`);
    return { reqId, success: true, data: response.data };
  } catch (error) {
    // if (retryCount < RETRY_LIMIT) {
    //   log("warn", `User ${reqId}: Retry ${retryCount + 1} due to error.`);
    //   return simulateUserRequest(reqId, ticket_id, retryCount + 1);
    // }
    log(
      "error",
      `User ${reqId}: Failed after ${RETRY_LIMIT} attempts. Error: ${JSON.stringify(error.response.data)}`
    );
    return { reqId, success: false, error: error.message };
  }
};

// Main function to run concurrent requests
const runConcurrentRequests = async () => {
  const limit = pLimit(CONCURRENCY_LIMIT); // Concurrency limiter
 
  const userRequests = Array.from({ length: TOTAL_USERS }, (_, i) => {
    const reqId = i + 1;
    ticket_id = ticket_id + 1;
    if(ticket_id > 2000) {
      ticket_id = 1;
    }
    const req_ticket_id = 37488 + ticket_id; // Increment ticket_id for each user
    return limit(() => simulateUserRequest(reqId, req_ticket_id));
  });

  log("info", `Simulating ${TOTAL_USERS} user requests with a concurrency limit of ${CONCURRENCY_LIMIT}...`);

  const results = await Promise.all(userRequests);

  // Summary
  const successfulRequests = results.filter((result) => result.success).length;
  const failedRequests = results.length - successfulRequests;

  log("info", "Test Results:");
  log("info", `Total Requests: ${TOTAL_USERS}`);
  log("info", `Successful Requests: ${successfulRequests}`);
  log("info", `Failed Requests: ${failedRequests}`);
};

// Execute the script
runConcurrentRequests()
  .then(() => log("info", "Testing completed successfully"))
  .catch((err) => log("error", `Error during testing: ${err.message}`))
  .finally(() => logWorker.terminate()); // Terminate the logging worker
