require('dotenv').config();

const DB = require('./db.js');

const { onPRMessage } = require('./slack.js');
const { createPR, checkPR, addReaction, removeReaction } = require('./pr.js');
const { EMOJIS } = require('./consts.js');

const check = async meta => {
  const {
    merged,
    quick,
    reviewed,
    changesRequested,
    needsAttention,
    closed,
    unstable,
  } = await checkPR(meta);

  if (needsAttention) {
    await addReaction(EMOJIS.needsAttention, meta);
  }

  if (changesRequested) {
    await addReaction(EMOJIS.changes, meta);
  } else {
    await removeReaction(EMOJIS.changes, meta);
  }

  if (quick) {
    await addReaction(EMOJIS.quick_read, meta);
  }

  if (reviewed) {
    await addReaction(EMOJIS.commented, meta);
  }

  if (unstable) {
    await addReaction(EMOJIS.unstable, meta);
  } else {
    await removeReaction(EMOJIS.unstable, meta);
  }

  if (merged || closed) {
    await removeReaction(EMOJIS.needsAttention, meta);
    if (merged) {
      await addReaction(EMOJIS.merged, meta);
    } else {
      await addReaction(EMOJIS.closed, meta);
    }
    DB.unregisterPR(meta);
  } else {
    DB.updatePR(meta);
  }

  console.log('');
};

onPRMessage(({ user, repo, prID, slug, channel, timestamp }) => {
  try {
    if (DB.hasPR(slug)) {
      return console.log(`${slug} is already being watched`);
    }
    console.log(`Watching ${slug}`);

    const meta = createPR({
      slug,
      user,
      repo,
      prID,
      channel,
      timestamp,
    });

    DB.registerPR(meta);
    check(meta);
  } catch (error) {
    console.log(error);
  }
});

function loop() {
  const PRs = DB.getPRs();
  console.clear();
  console.log(`Watch list size: ${PRs.length}`);
  console.log('--------');
  for (const meta of PRs) {
    check(meta);
  }
}

loop();
setInterval(loop, 65 * 1000);
