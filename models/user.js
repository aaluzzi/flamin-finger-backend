const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  name: String,
  highscore: Number,
  highscoreDate: Date,
});

module.exports = mongoose.model('User', userSchema);