import axios from "axios";
import pLimit from "p-limit";
import { Worker } from "worker_threads";

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 2000; // Total number of simulated users
const CONCURRENCY_LIMIT = 2000; // Number of concurrent requests
const RETRY_LIMIT = 1; // Number of retries for failed requests

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
      { id: 74, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczNDMzNDA0NiwiZXhwIjoxNzM0MzU1NjQ2fQ.USRk2y9M-JqEbDmpIb-o47ksUTTVCagHuVwlKh6ZJz7JRvQcS5TApQ2vGtRj-P1HTqQdIC2npFCpiwtEecUJkfheR4ll_O_0Z2jLkm_aKaO_k8mfqnXPWx7a6aTGeaD5Pcoh9ujjTHEIHV76N9eT5A7LWaPkfqLrvSjT1KcnjYGFH3ElK-Dag8lpuypZF2M3A5mpcsItsdLHmal721hZX9yG4uqa52h0muaexevjxAcctAalvHvGpxsiqla6RPJsMLNv_EvKGQ99MS2pX5DIIW_iDtVltICJC3yeGMYaBQSe8xpLjwocMA1MrHwdAGtzxo0p2WNFEmND2DttvfsfVuZYNouJARxej4BVhWflkhoAh3QtIOp_hdqLtkeYAs4uXtq0WLYZPkzKlnEePClH0abKT7B_-e9FuYqhwBDWBFkBYi-IduaObTnCgv13xtdOu_tA2n-WlONqzFiLJXU8Y2oKoVhToY7NCoQO4_7R0WFKyyZ9KZhdvAjuEqnWOPj3UmCYWBmBT4nmHSUKcua_CJMhICw0MSe3FBv6r0ZFeWYfLWo47V9qqU5Z5Z9uzVuP_EQsZ6CwGHItCr8LiFVv-BVapkpMhSkUMe1K6lz5OC1e_iLzDbFvAWRTJoxGU86dtoTg14xsABtxa1hTO98kxiNQLnZSVqU_apY56pIpn9I"
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
    const ticket_id = 12688 + reqId; // Increment ticket_id for each user
    return limit(() => simulateUserRequest(reqId, ticket_id));
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
