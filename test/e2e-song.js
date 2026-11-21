'use strict';

// Walks Song mode in Practice mode: record two parts with Space, hear the
// arranged song, then play along with the breath guide.
const path = require('path');
const { freePort, launchElectron, attach, stopApp, waitFor, sleep, assertNoFatal } = require('./e2e-practice');

const SPEED = 6;

async function song(cdp) {
  return cdp.eval('window.__breathOrchestraTest.song()');
}

async function click(cdp, selector) {
  const ok = await cdp.eval(`(() => {
    const btn = document.querySelector(${JSON.stringify(selector)});
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  })()`);
  if (!ok) throw new Error(`could not click ${selector}`);
}

async function breathe(cdp, ms) {
  const end = Date.now() + ms;
  let down = false;
  while (Date.now() < end) {
    down = !down;
    await cdp.send('Input.dispatchKeyEvent', {
      type: down ? 'keyDown' : 'keyUp', code: 'Space', key: ' ', windowsVirtualKeyCode: 32,
    });
    await sleep(350);
  }
  if (down) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ', windowsVirtualKeyCode: 32 });
  }
}

async function panel(cdp) {
  return cdp.eval(`({
    title: document.getElementById('song-title').textContent,
    message: document.getElementById('song-message').textContent,
    count: document.getElementById('song-count').textContent,
    actions: [...document.querySelectorAll('#song-actions [data-song-action]')].map((b) => b.dataset.songAction),
    featured: [...document.querySelectorAll('#song-players .player.is-featured')].map((p) => p.id),
    players: [...document.querySelectorAll('#song-players .player')].map((p) => p.id),
    guideHidden: document.getElementById('song-guide').hidden,
    cue: document.getElementById('song-cue').textContent,
    liveHidden: document.getElementById('live-player').hidden,
    liveKind: document.getElementById('live-player').className,
  })`);
}

async function main() {
  const port = await freePort();
  const { child, logs } = launchElectron(port, ['--sim', `--songSpeed=${SPEED}`]);
  let cdp;
  try {
    cdp = await attach(port);
    await waitFor(() => cdp.eval("!document.getElementById('hud').hidden"), 15000, 'HUD');
    await click(cdp, '#mode-song');
    const setup = await song(cdp);
    if (setup.phase !== 'setup') throw new Error(`expected setup, got ${setup.phase}`);

    for (const kind of ['violin', 'flute', 'drums']) await click(cdp, `#song-parts [data-kind="${kind}"]`);
    const chosen = (await song(cdp)).chosen;
    if (chosen.join(',') !== 'cello,piano') throw new Error(`chosen ${chosen}`);
    await click(cdp, '[data-song-action="start"]');

    const counting = await waitFor(async () => {
      const p = await panel(cdp);
      return /Cello, your turn/.test(p.title) ? p : null;
    }, 5000, 'cello count-in');
    console.log(`e2e song: "${counting.title}" - ${counting.message}`);

    const breathing = breathe(cdp, 9000);
    await waitFor(async () => (await song(cdp)).current === 'piano', 15000, 'piano turn');
    const piano = await panel(cdp);
    console.log(`e2e song: "${piano.title}" with ${piano.players.join(', ')} backing`);
    await breathing;

    const listening = await waitFor(async () => {
      const s = await song(cdp);
      return s.phase === 'listen' ? s : null;
    }, 20000, 'song playback');
    console.log(`e2e song: arranged ${listening.song.sections.join(' > ')} (${listening.song.totalBars} bars)`);
    if (listening.song.order[0] !== 'piano') throw new Error('piano should open the song');

    await waitFor(async () => (await panel(cdp)).featured.length === 2, 15000, 'both players lit');
    const shotListen = path.join('/workspace', 'breath-orchestra-song-listen.png');
    await cdp.screenshot(shotListen);
    await waitFor(async () => (await song(cdp)).phase === 'done', 30000, 'song to finish');
    const done = await panel(cdp);
    console.log(`e2e song: done - "${done.title}" actions ${done.actions.join(', ')}`);
    const audio = await waitFor(async () => {
      const s = await song(cdp);
      return s.audioBytes > 0 ? s : null;
    }, 8000, 'captured song audio');
    const saveEnabled = await cdp.eval("!document.querySelector('[data-song-action=\"save\"]').disabled");
    if (!saveEnabled) throw new Error('Save audio should be enabled once the song is captured');
    console.log(`e2e song: captured ${audio.audioBytes} bytes of ${audio.audioType}`);

    await click(cdp, '[data-song-action="pick"]');
    const pick = await panel(cdp);
    if (!pick.actions.includes('perform')) throw new Error(`no part to pick: ${pick.actions}`);
    await click(cdp, '[data-song-action="perform"][data-kind="cello"]');
    const along = breathe(cdp, 8000);
    const guided = await waitFor(async () => {
      const p = await panel(cdp);
      return !p.guideHidden && /Breathe in|and out|Stay with it/.test(p.cue) ? p : null;
    }, 15000, 'breath guide cue');
    if (!/is-cello/.test(guided.liveKind) || guided.players.includes('song-player-cello')) {
      throw new Error(`the performer should be the live cello, not a backing seat: ${JSON.stringify(guided)}`);
    }
    console.log(`e2e song: playing along on ${(guided.liveKind.match(/is-(cello|flute|violin|piano|drums)/) || [])[1]}, cue "${guided.cue}", band: ${guided.players.join(', ')}`);
    const guidePixels = await cdp.eval(`(() => {
      const c = document.getElementById('song-guide-canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) lit += 1;
      return lit;
    })()`);
    if (guidePixels < 200) throw new Error(`breath guide looks empty (${guidePixels} px)`);
    const shotPerform = path.join('/workspace', 'breath-orchestra-song-perform.png');
    await cdp.screenshot(shotPerform);
    const scoreWords = await cdp.eval("/score|grade|accura|%|points/i.test(document.getElementById('song-panel').textContent)");
    if (scoreWords) throw new Error('Song mode should never show a score');
    await along;
    await waitFor(async () => (await song(cdp)).phase === 'done', 30000, 'play-along to finish');
    const finale = await panel(cdp);
    console.log(`e2e song: play-along done - "${finale.title}"`);

    await click(cdp, '#mode-free');
    const back = await cdp.eval("({ hidden: document.getElementById('song-panel').hidden, players: !document.getElementById('players').hidden })");
    if (!back.hidden || !back.players) throw new Error(`free play did not come back: ${JSON.stringify(back)}`);

    assertNoFatal(cdp, 'song mode');
    console.log('e2e song screenshots:', shotListen, shotPerform);
    console.log('OK');
  } catch (err) {
    err.message += `\n--- electron log ---\n${logs.join('').slice(-3000)}`;
    throw err;
  } finally {
    if (cdp) cdp.close();
    await stopApp(child);
  }
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
