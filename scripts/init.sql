-- Create the database
CREATE DATABASE IF NOT EXISTS boiler-plate;

-- Create a user and grant privileges
CREATE USER 'secureadmin1'@'%' IDENTIFIED BY '!!19$^ashiK!!19$^';
GRANT ALL PRIVILEGES ON boiler-plate.* TO 'secureadmin1'@'%';