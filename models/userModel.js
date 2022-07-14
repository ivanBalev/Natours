const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    // prevents the password from showing up when getting a user from DB
    select: false
  },
  passwordConfirm: {
    type: String,
    // required means required for the input, not for the database!
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function(el) {
        // this is only going to work on CREATE and SAVE!
        return el === this.password;
      },
      message: 'Passwords do not match'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// QUERY MIDDLEWARE
userSchema.pre(/^find/, function(next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  // 12 refers to how cpu intensive the hashing will be
  this.password = await bcrypt.hash(this.password, 12);

  // We set it to undefined in order to prevent persistance to the database
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  // -1000 to compensate for possible delays when saving to server => invalid jwt token
  // Doesn't make sense that this would make a difference as the dalay with saving
  // has nothing to do with the timestamp we set on the server
  // this.passwordChangedAt = Date.now() - 1000; // 1 second;

  this.passwordChangedAt = Date.now();

  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  //this.password won't work due to the select: false
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // Check whether the password hasn't been changed after the token's issuing
    return JWTTimestamp < changedTimestamp;
  }

  // False means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
