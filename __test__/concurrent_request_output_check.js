const axios = require("axios");

// Dynamic import for p-limit
const loadPLimit = async () => await import("p-limit");

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-tocket"; // Replace with your API endpoint
const TOTAL_USERS = 100000; // Total number of simulated users
const CONCURRENCY_LIMIT = 10000; // Number of concurrent requests

// Function to simulate a single user purchase request
const simulateUserRequest = async (reqId, ticket_id) => {
  try {
    const response = await axios.post(
      API_URL,
      { id: 24, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`User ${reqId}:`, response.data);
    return { reqId, success: true, data: response.data };
  } catch (error) {
    console.error(`User ${reqId} failed:`, error.response.data);
    return { reqId, success: false, error: error.message };
  }
};

// Main function to run concurrent requests
const runConcurrentRequests = async () => {
  const { default: pLimit } = await loadPLimit(); // Load p-limit dynamically
  const limit = pLimit(CONCURRENCY_LIMIT); // Create a concurrency limiter
  const userRequests = Array.from({ length: TOTAL_USERS }, (_, i) => {
    const reqId = i + 1;
    const ticket_id = 2700 + reqId; // Increment ticket_id for each user
    return limit(() => simulateUserRequest(reqId, ticket_id)); // Limit the concurrent execution
  });

  console.log(`Simulating ${TOTAL_USERS} user requests with a concurrency limit of ${CONCURRENCY_LIMIT}...`);
  const results = await Promise.all(userRequests);

  // Summary
  const successfulRequests = results.filter((result) => result.success).length;
  const failedRequests = results.length - successfulRequests;

  console.log("Test Results:");
  console.log(`Total Requests: ${TOTAL_USERS}`);
  console.log(`Successful Requests: ${successfulRequests}`);
  console.log(`Failed Requests: ${failedRequests}`);
};

// Execute the script
runConcurrentRequests().catch((err) => {
  console.error("Error during testing:", err.message);
});