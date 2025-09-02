// Talk.js
const mongoose = require('mongoose');

const watchNextSchema = new mongoose.Schema({
  data: { type: mongoose.Schema.Types.Mixed },
  partial: Boolean
}, { _id: false });

const talk_schema = new mongoose.Schema({
  _id: String,            
  slug: String,
  title: String,
  url: String,
  description: String,
  speakers: String,
  duration: String,
  publishedAt: String,
  tags: [String],
  watch_next: [watchNextSchema],
}, { collection: 'tedx_data', strict: false });

module.exports = mongoose.model('talk', talk_schema);
