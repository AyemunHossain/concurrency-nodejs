import axios from "axios";
import pLimit from "p-limit";
import { Worker } from "worker_threads";

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 200; // Total number of simulated users
const CONCURRENCY_LIMIT = 10; // Number of concurrent requests
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
      { id: 62, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczMzk0NTk0NywiZXhwIjoxNzMzOTY3NTQ3fQ.l_8WXT4pZP6y1D1WX9PQNT1Kon0bzXH0U3trT3cH0_LAWivXE5FGEHOnvhIBP_i3U5SAncA4reRDGEU1XGdA0NL2J54TK9ZMqD-pHg60X9THGph4kV87f4LjolRnhpZ1ATg-ZtagqtaxjNoHhtuVIbzISBLXEVX2Z_f3wS152JHumXKCXCHzUUEqa2UWYV8Wav9_nfuRygQXVqpJXET_LYI6J2Ju5MIwoQgJG1CIOlhvL-3cpC3VxNcCpLE7pxJSHhOij_cI35sq5hKtrIEQC6NYXyiOCHbFgDF-DAsOT0anSlN9_Ohjm10MzNtNAOb5Oe8sBnvcavxYMbKEmLRGSkYcF_DgXgAa5SOo39GdbJNat0et1pFPkUYMzdGyZKYGc7vTZexNMfo2dI28dCebYiz74kfi2VoMYbzp9X97_ItQjU0QZnFgheVaCrGJIjv0MqhkfS7JrL1VbukFQImI8nJC9OZCTppC9nhtpa9vxwlyKVHmmSg46xb3vynEJk32nYJRPo0j9n-s9ypJtXrUe9pe7PvvO3LTEOVG22Ci1Mv_CvrVxL1qFKPO2kC5Hv3CtNMps4pKKGz9AWQpO24lRuX-DGe8nLJ8UJy7i1lFJxbyFeg5YdvAUzhYz_Cb9UpCLErDmoAWzX-qubgp-opyD5uz6_N141tECUUdn28D1X0"
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
    const ticket_id = 10288 + reqId; // Increment ticket_id for each user
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
