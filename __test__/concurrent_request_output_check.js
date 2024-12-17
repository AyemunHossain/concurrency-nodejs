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
      { id: 83, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczNDQ1NDE3MSwiZXhwIjoxNzM0NDc1NzcxfQ.alb0dj4KJakQgRKXy39snJ3TIQeThEhSxVxnw6KwkLiY9k4rqht99ZgzMerTZwppFfqzY0TWhpYYpG6jk09RjOfsISYM5kMc-G-aXiSMmMuZuInTfrO1YAQ9lOVIZu5EO7EPBuAVXXllK-9nzfHc3PYy3h8h-oChx4k-H1_2COhP435d644E0OXYGcqYp6T4D98IVgSz9DjkqeKWkNLy-kd-z7sI_ACS4Sh9HXm6bglCNStN7fFYk4t-2EvLo3etPCfrvhtIKeaf_U6EaTcQPTd1NpXekr9d3f07kpk_cHbtZQNGGF101n_Oc84mPrzwMHJU7uzFyi6j6_QKvEOo5Ji9rtL7ywLjiwSbzY8WnRE4q50sbSZpJdSEwgxjSqQ0_6BIYNYjBh7VHa7e8IcdamHvTczX0kAtQENDeo60S6UUhriI8UPRURGtHvssKlyGOwME_Th2lAQp-6MXjLr4XHGSi__2oOVn7-W1At4TU2tN4kHDvVJzn0MfXO8uUG5nxJqB7r-kU_S9qZNIa2Rpxedi6PDY2RY7Tg974C08p7W0yGU2ouwP7_9jpSTK45J3Z2ISuahMjTtClElpHFKWWN7tLbjlZ_qt3Fq9i1tdDssVuPk62RnpO9wgNwcolNy9qd3nEci3-lvo6xi3GDYBQGkLmhVIAvgwZdBoyFHQXf8"
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
    const req_ticket_id = 23488 + ticket_id; // Increment ticket_id for each user
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
