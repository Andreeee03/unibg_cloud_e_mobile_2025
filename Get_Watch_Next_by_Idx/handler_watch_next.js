// handler_watch_next.js
require('dotenv').config({ path: './variables.env' });
const connect_to_db = require('./db'); // connessione mongoose
const { getCurrentTalk, pickByIdx, paginate } = require('./watchService');
const { explainWithGemini } = require('./explain_gemini');

const ok = (obj, code=200) => ({
  statusCode: code,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  },
  body: JSON.stringify(obj)
});
const ko = (msg='Bad Request', code=400) => ok({ error: msg }, code);

// POST /watch-next/by-idx
module.exports.get_watch_next_by_idx = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; } catch {}
  const { id, idx = 0 } = body;
  if (!id && !body._id) return callback(null, ko('missing id'));
  const _id = id || body._id;

  try {
    await connect_to_db();
    const current = await getCurrentTalk(_id);
    if (!current) return callback(null, ko('talk not found', 404));

    const candidate = pickByIdx(current.watch_next || [], Number(idx));
    if (!candidate) return callback(null, ko('index out of range', 404));

    const why = await explainWithGemini(current, candidate);

    return callback(null, ok({
      current: { _id: current._id, title: current.title, tags: current.tags || [] },
      candidate,
      why
    }));
  } catch (e) {
    console.error(e);
    return callback(null, ko('internal error', 500));
  }
};
