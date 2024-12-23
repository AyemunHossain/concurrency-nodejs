import axios from "axios";
import pLimit from "p-limit";
import { Worker } from "worker_threads";

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 1000; // Total number of simulated users
const CONCURRENCY_LIMIT = 200; // Number of concurrent requests
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
      { id: 99, ticket_id, user_id:reqId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczNDk3MDUxMCwiZXhwIjoxNzM0OTkyMTEwfQ.g0Cif7CIOBjyvNxZ8ZB4tbErrlMu-3BF_Dt27gujraBP6ScyTtP-BimjwMchSD0yNKS0zKVfqCx3YEmCYUu4BxobWc5R71H5_Uv7gIeD-a31uE3vcfrFmchNexpNhgYEOw6Oc3Ion8sGisceIDFrY8p4Xzu6Ow0EOHw8QYoKRurhFH730EZKQksML9xbZJW6vH3Yg_OFv-4TVnJRR0Te8QPtDAGe0uofmBbPWExUVDL2radm0wHBEGl3HwE4244-IjnEnWYFn7GJ8-4gAdNbkIrk-OcLHl3TuSyQiShBlFnBhvicOjuBGtKWRVvnMyyCPVO13DNgmLi5JOu74b50igPd0i8eZaV26srCdh7emUsrMm2m733XyHgDVmjdNHPr8p7eFJnceuRaF4_j0J0XnavZSazrGzyGSqeZhHoibl532lU4CIPvvz_rc7AKMWl524rum-_6sicxpp4h7bv7SUCWsOd8Cp4AsEaElIhTCHvLXxA1UoSiNGniK1fDDdn4iaU5MaNRHe7OUygZ2UcdKBKoARrAQMjZID2UiW1xUuvsZPQtzKG_qh6LGKU83qqJBHGkUOEnylBzLwSE3Wwq0u8WKdsqwVzgU_smFbOjBBVdNLOl4fVlEZSwC_Mz97WADnXt03a8St-vMfXj6VAS1pdMA9SbDWypWBu7EoZy8_E"
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
    if(ticket_id > 10) {
      ticket_id = 1;
    }
    const req_ticket_id = 39568 + ticket_id; // Increment ticket_id for each user
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
