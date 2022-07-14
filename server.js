const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Not bad to use this as a last resort but we really should have a means
// of handling all possible erorrs right where they may occur and rely on
// this only for errors that are completely unexpected.
process.on('uncaughtException', err => {
  console.log('UNHANDLED EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  // 1 means unhandled error. 0 means everything was fine.
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

// app needs to be created after config is read. Otherwise
// the config will not apply. It cannot be read after app is initialized

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    // Deprecation warnings
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => {
    console.log('DB connection successful');
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Safety net
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    // 1 means unhandled error. 0 means everything was fine.
    process.exit(1);
  });
});
