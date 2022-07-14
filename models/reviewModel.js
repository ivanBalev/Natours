const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Review must have a rating']
    },
    createdAt: {
      type: Date,
      // Timestamp is automatically converted to date by Mongo.
      default: Date.now(),
      select: false
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: '-guides name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });

  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

// TODO: WHY STATIC?
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 }, // calclulate the number of reviews
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// Prevents a user from creating more than 1 review per tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.post('save', async function() {
  // TODO: WHAT THE HELL IS THIS MAN
  this.constructor.calcAverageRatings(this.tour);
  // POST MIDDLEWARE DOESN'T GET ACCESS TO next()
  // TODO: I THOUGHT MIDDLEWARE ALWAYS HAD ACCESS TO IT BE MAIKA?!
});

// findByIdAndDelete & findByIdAndDelete need to be covered by this
// the actually evaluate to findOneAnd... with {_id: ...}
reviewSchema.pre(/^findOneAnd/, async function(next) {
  // We attach the current review to the query object in order to have
  // access to it in the post middleware
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); does NOT work here. Query has already executed
  // this refers to the query, not the object
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
