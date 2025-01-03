'use strict';

import cluster from 'cluster';
import os from 'os';
import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();
const port = process.env.PORT || 5000;

if (cluster.isMaster) { 
  // Get the number of available CPU cores
  const numCPUs = os.cpus().length;
  console.log(`Master process is running. Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Listen for dying workers and replace them
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking a new worker...`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case, it is an HTTP server
  app.listen(port, () => {
    console.log(`Worker ${process.pid} running on port ${port}`);
  });
}