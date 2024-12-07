import axios from 'axios';
import pLimit from 'p-limit';

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 1000; // Total number of simulated users
const CONCURRENCY_LIMIT = 1000; // Number of concurrent requests

// Function to simulate a single user purchase request
const simulateUserRequest = async (reqId, ticket_id) => {
  try {
    const response = await axios.post(
      API_URL,
      { id: 39, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczMzU5MzYyNiwiZXhwIjoxNzMzNjE1MjI2fQ.r4WILuvkwHWmLSUeLYKksh5yuuHFonnIUCo3idfzfInjQOi65hMwWl4iwo20SbX6sHvpyzQT_4ly-LuPe-SeI1hxyY8BAOBQtYHvXE7LaMaf0AVYcJWU62crqnsMRVcUYYTyGr0bPM2LUlpmmcxkt6JvWYX2bI15m_EEpl6Ax85U8plLGy_S1UXF4QwawEm0bDtTdzkz9KoAeW9t9L7OlJ2ppvTP4Nyt2IE0BNbJMhJqwyurjjnd0_6dlLB9c9wpdYAX8BW725b8DhkPkSuoPSrTBr-hkdXtGnryT4YLuVQuVZ7Ip_P-VVaBcosamSneh9VEikQ4r3l8kL0Ep35e39yCLH-NHXbMIBaFAXem2syh6b3ZJwnF7h5hrLJF-3etlPc8LAGBBSp4PB8M-fd-eSItJ5fmf6rjysQft-Z-V3ZUumRLPHdPLlnLRa22jiT_81jNNMkJqDHTGlxzRFLZRq2RK6p5qA4sAVzEW0P6JMe9CpKHPfU_Jub5otFu9rS1Ih-jNIs0shBgd4Ze_7N2RUSGVUaToxe15V7yR8lgLbGmxaSUb43TZR506FBRLlVfyPYI0Byxsyfo08Xc6flmo0Sz9hx2ulM5uD3LMSA0oG7lKAsKKyr5kE7gODCIJ8M2fHPoEX8hH7t06qWwzz90EslAKyfAAy2MoU_i-7XCtnQ"
        },
      }
    );

    console.log(`User ${reqId}:`, response.data);
    return { reqId, success: true, data: response.data };
  } catch (error) {
    console.error(`User ${reqId} failed:`, error.response?.data || error.message);
    return { reqId, success: false, error: error.message };
  }
};

// Main function to run concurrent requests
const runConcurrentRequests = async () => {
  const limit = pLimit(CONCURRENCY_LIMIT); // Create a concurrency limiter
  const userRequests = Array.from({ length: TOTAL_USERS }, (_, i) => {
    const reqId = i + 1;
    const ticket_id = 5688 + reqId; // Increment ticket_id for each user
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
