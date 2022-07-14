const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

// GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100, // 100 requests per hour from same ip. Adjust to your needs, of course
  windowMs: 60 * 60 * 100, // minites * seconds * milliseconds
  message: 'Too many requests from this ip, please try again in an hour'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // limit body size

// Data sanitization against NoSQL query injection (convert Mongo symbols)
app.use(mongoSanitize());

// Data sanitization XSS attacks (convert HTML symbols)
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'average',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
); // Whitelist the duration, average... etc. parameters because we can enter them in
// the query string more than once which is an expected behaviour. Not for the sort parameter though

// Serve static files
app.use(express.static(`${__dirname}/public`));
// Mount routers
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// If this point is reached in a request, none of our routes have matched the request route
app.all('*', (req, res, next) => {
  // if at any point we pass anything into a next() function, express automatically assumes
  // this is an error and jumps to the error-handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// 4 arguments -> express automatically recognizes this middleware as error-handling
app.use(globalErrorHandler);

module.exports = app;
