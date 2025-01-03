import axios from "axios";
import pLimit from "p-limit";
import { Worker } from "worker_threads";

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 30000; // Total number of simulated users
const CONCURRENCY_LIMIT = 10000; // Number of concurrent requests
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
      { id: 107, ticket_id, user_id:reqId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczNTg5NzIxMSwiZXhwIjoxNzM1OTE4ODExfQ.ffsF_SOEAEqQ2ASZgopxTmGpYGQjzn6MAt32r0gj-8uuL4VSi5h_RMjoA3i7xldMwMIYMFzF9Uk6QooZlwBj2GtxtTX9wyaOk1Cw_ovGFJmNOyGX3ro5u4llDhSlRb5-ND5NzdfAiRMU-mOO6lYg0LmKaavgbMkBdusx8Rj2q8mayBI-6GtFmLFxM4eFkA-hqhHOlGPz2utVezU9D4aCcvCCDGyKD9vZLMSyduh2V8jJufAwmNkoZDxE6Rls7rHE6LQ0goniC-2W84SW163ZIp9QxxNfkN93l3tEUhvPewZvuZ3nrOm7ypKkG8NdYNrGq0977TYe6r4pjlVocNaheGWQPp9hnb-CT0beqAJhvHc8_FeEcJaRZGrwt3HJlTFH--faf8pMPS95UYFBrSmHHwqSJtOaNlt8yq3PD-nzgAtpGqEEw3peWp4KxSc3X4H7HfbCMy98i9tD7QVp4miLIhfzsullxS-fKFLU46kVDIht9Oi34IS-WFcYEh6uVlp-TE4n7BuHLCC4p707O0V7sV-K8B3cfInSAFyxYXVdPGUQoeeoz6qz-DmvoSxTmG5HIQf6e9JYy-emY7ymidseTlBeEHUUkgE4tr-MvB9x6QSU5tSOgauwXO9c95tSEok8vHpGv4Z8Gv27dhkKwdWRAHxIL7mxw_-YuqoeAu1FBv8"
        }
      }
    );

    log("info", `User ${reqId}: Ticket-${ticket_id}: ${JSON.stringify(response.data)}`);
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
    if(ticket_id > 1000) {
      ticket_id = 1;
    }
    const req_ticket_id = 43608 + ticket_id; // Increment ticket_id for each user
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
