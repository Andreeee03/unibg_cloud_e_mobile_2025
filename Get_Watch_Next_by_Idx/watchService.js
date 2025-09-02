// watchService.js
const talk = require('./Talk');

async function getCurrentTalk(_id) {
  // leggiamo tutto il documento (watch_next incluso)
  return talk.findOne({ _id }).lean();
}

function pickByIdx(watchNext = [], idx = 0) {
  if (!Array.isArray(watchNext)) return null;
  return (idx >= 0 && idx < watchNext.length) ? watchNext[idx] : null;
}

module.exports = { getCurrentTalk, pickByIdx };
