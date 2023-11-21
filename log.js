const winston = require('winston');

/**
 * Configures and creates a Winston logger.
 *
 * Winston is used for logging information and errors during the application's runtime.
 * This configuration sets up a logger that outputs logs in JSON format with a timestamp,
 * log level, tab identifier (if provided), and the log message.
 *
 * The logs are output to both the console and a file named 'glasto.log'.
 */
const logger = winston.createLogger({
    // Combining multiple log formats.
    format: winston.format.combine(
        // Adds a timestamp to each log message.
        winston.format.timestamp(),
        // Formats the log as a JSON.
        winston.format.json(),
        // Custom function to format the log message.
        winston.format.printf((info) => {
            return JSON.stringify({
                timestamp: info.timestamp,
                level: info.level,
                // Custom attribute for logging the tab number.
                tab: info.tab,
                message: info.message
            });
        })
    ),
    // Defining the transports for logging: console and file.
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'glasto.log' })
    ]
});
// Exporting the configured logger for use in other modules.
module.exports = logger;
