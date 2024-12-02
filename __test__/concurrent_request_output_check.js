import axios from 'axios';
import pLimit from 'p-limit';

// API endpoint configuration
const API_URL = "http://localhost:6001/api/purchase-ticket"; // Replace with your API endpoint
const TOTAL_USERS = 100000; // Total number of simulated users
const CONCURRENCY_LIMIT = 1000; // Number of concurrent requests

// Function to simulate a single user purchase request
const simulateUserRequest = async (reqId, ticket_id) => {
  try {
    const response = await axios.post(
      API_URL,
      { id: 35, ticket_id },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjgsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJ0ZXN0NkBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJ0ZXN0IiwidHlwZSI6ImFjY2Vzcy10b2tlbiIsImlhdCI6MTczMzE1Njg2MywiZXhwIjoxNzMzMTc4NDYzfQ.1zQLbyN6vnxxs1SUM2jYmLPxwmG58lc71tsQZ6p6OeiM6Dn-9ygoYiyAKJs5ZZuOqsIYbeeBLzM8eOUlbvolInEPPMEA_rVfU10i1qNgG5DWtnpJ5S6Z3rZBAU1DGNMV_yKmza2TDBFkJj9UVINd97trbcZwnuXs3zxup-YmonUGFnlUcw-BAsEV5M1MEG6uOBz8w3A0Z5oe7fJpf5yZyFeXGxEms6ODoVJRyxLx7c3zD9gOZqNbh5xewyHq3diPdxMxpFiRQibPH78DGTpFjghmP8Byce-3pGHQRjmSjy5NzgtgBV54LVhXw6XaFyexbaFCfUfaklBNetpqQUxOXxE3H68Ti8AOsjmXcUt_ksv0Bpf1tGDGwtj-iRmsD_02Fsx7uj1vYDj17GWd8Da8yrj4NTIVW6MsEflM0bMxG320FwJhXv8zJQy4KXo6vAZ8OCQ__lPg9Z6_4kxcsrBNKKwSkfoYYMBYlVtmWmyN_xKBKII--4YmFue79lrARbcBcEZDy5nORvGld7cg0sQSooQbxGePtyVpfK1kQuLv-X-_O70QyotjCsN_mt7RZBmqUSSmd_n5IuAva7LSZua9kxu71J1xuQ0jcD3iWrKKJ7SXE0fkdIPxW4EkwUsV7J2k89mHIONlq5Qh05H0pjbrwnWWVbgN-O5PfU8HFMnPSfE"
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
    const ticket_id = 4889 + reqId; // Increment ticket_id for each user
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
