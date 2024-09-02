const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  name: String,
  mouseHighscore: Number,
  mouseHighscoreDate: Date,
  touchHighscore: Number,
  touchHighscoreDate: Date,
});

module.exports = mongoose.model('User', userSchema);