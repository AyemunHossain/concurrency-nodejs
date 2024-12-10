import axios from "axios";
import pLimit from "p-limit";
import { Worker } from "worker_threads";

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 1000; // Total number of simulated users
const CONCURRENCY_LIMIT = 1000; // Number of concurrent requests
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
      { id: 61, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczMzg0OTE1MiwiZXhwIjoxNzMzODcwNzUyfQ.kzDMfzMXfJYwa8YJ5OCFP1C-KpTt3i4McOcjyCGAvJPio1Wv3bykI3M5WBI94cp2R-GaD-yikjRovprF-GmbVOMihXvb_0weNJ2It5O1vkrVNg52emDzlW4eS9bBGMU7PaJCChMISNu3CkVU9QW1dH9jCdf6xmAkxb6xMaRGCxEBPasaXRFlxaAhPcIjN-ves7pUqWJhwcaeMMfVRj9nVFfNt4UyQgWV8ob29FhijaCPhBCQvo8ypXxe7E0S_XotxuCqWE8yzBdXOE_j7m59tjannnQ5-X6d072y3s8E4JWl8u5QJG-tONlK0nVCAMoHHvkuzCpmLop7owGYTArgf9htNWYpK4vh5VadPdCbviPO4RG0avu8SSHbB8tQSe38x3BIIx7FaBjcLEwa3A42XNo_F5OBy344nopDxH7JTuQWOTbe0wdXNJyhsveN62RfNj6jk8SndrMfWbcmxyPqVoVBlZfOrx5sN4zbE0uzMW2TuI3OT-3IrsPN8hmSQn-RulhyrVVL4-TI8MO9WJTYti0-gZIOgBAaH5R-qIoOwuc-OcwlYcIHGlKB2nXJ2PznfTKkvB70g9yvssqBG0vLt4_4nvuibLupUiys4FKK85at1KUk87WJgeaedLMWgZWV5szBZITMuGyCXLZ-pVUFkFLCyxSS_Pn0qqYVGwIP1mY"
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
    const ticket_id = 10088 + reqId; // Increment ticket_id for each user
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
