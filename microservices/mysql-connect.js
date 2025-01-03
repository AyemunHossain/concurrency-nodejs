import mysqllib2 from 'mysql2';
import config from 'config';

// Create a pool cluster
const mysql = mysqllib2.createPoolCluster();

// Configuration for the master database (write operations)
const masterConfig = {
  host: config.get('mysqldb.host'),
  user: config.get('mysqldb.username'),
  password: config.get('mysqldb.password'),
  database: config.get('mysqldb.db'),
  port: config.get('mysqldb.port'),
  waitForConnections: true,
  connectionLimit: config.get('mysqldb.connectionLimit'),
  queueLimit: config.get('mysqldb.queueLimit'),
};

// Add the master configuration to the pool cluster
mysql.add('MASTER', masterConfig);

// Connection event handlers
mysql.on('enqueue', () => console.log('Waiting for available connection slot'));
mysql.on('release', (connection) => console.log('Connection %d released', connection.threadId));
mysql.on('acquire', (connection) => console.log('Connection %d acquired', connection.threadId));
mysql.on('connection', (connection) => console.log('Connection %d connected', connection.threadId));
mysql.on('error', (err) => console.log('Connection error: ' + err.stack));
mysql.on('close', (err) => console.log('Connection closed: ' + err.stack));

// Retrieve connection and run queries
mysql.getConnection('MASTER', (err, connection) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('MySQL Connected.');
});

// Handle termination signals
process.on('SIGINT', () => {
  mysql.end((err) => {
    if (err) {
      console.error('Error occurred while closing the connection: ' + err.stack);
      return;
    }
    console.log('MySQL connection closed.');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception: ' + err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection: ' + err);
  process.exit(1);
});

// Handle wornings
process.on('warning', (warning) => {
  console.warn('Warning: ' + warning.name);
});

// Export the pool cluster
export default mysql;
