const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  openid_identifier: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    unique: true, // Assuming email is unique per user
    sparse: true // Allows multiple documents to have null or missing email, but if present, it must be unique
  },
  // You can add more fields from OpenID response if available and needed
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);