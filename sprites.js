window.SPRITES = {
  drawBackground: function (ctx, width, height, time) {
    ctx.save();

    const palettes = [
      { top: '#172238', middle: '#41566d', bottom: '#c17b55', distant: '#2c3a4a', close: '#202b39', shelf: 'rgba(111, 78, 69, 0.75)', sun: '#ffd584' },
      { top: '#10182f', middle: '#263f68', bottom: '#6d83b3', distant: '#1c2d4a', close: '#14223b', shelf: 'rgba(91, 117, 167, 0.7)', sun: '#b9dcff' },
      { top: '#3a1832', middle: '#803f55', bottom: '#d28a58', distant: '#542a3f', close: '#351d35', shelf: 'rgba(183, 92, 73, 0.72)', sun: '#ffd09b' },
      { top: '#17112e', middle: '#4b3472', bottom: '#ad6ca0', distant: '#31234f', close: '#21183c', shelf: 'rgba(133, 86, 145, 0.72)', sun: '#f6c6ff' }
    ];
    const environment = Math.max(0, Math.floor(time / 1000)) % palettes.length;
    const palette = palettes[environment];
    const motionTime = time - Math.floor(time / 1000) * 1000;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, palette.top);
    sky.addColorStop(0.58, palette.middle);
    sky.addColorStop(1, palette.bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // A slow, simple sun makes the scene feel alive without hiding the play area.
    const sunX = width * 0.76 + Math.sin(motionTime * 0.12) * 4;
    const sunY = height * 0.23;
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, Math.max(18, width * 0.075), 0, Math.PI * 2);
    ctx.fill();

    // Distant mountain silhouettes suggest the endless climb.
    ctx.fillStyle = palette.distant;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.62);
    ctx.lineTo(width * 0.18, height * 0.42);
    ctx.lineTo(width * 0.34, height * 0.6);
    ctx.lineTo(width * 0.57, height * 0.34);
    ctx.lineTo(width * 0.82, height * 0.61);
    ctx.lineTo(width, height * 0.45);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = palette.close;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.lineTo(width * 0.24, height * 0.55);
    ctx.lineTo(width * 0.45, height * 0.72);
    ctx.lineTo(width * 0.7, height * 0.5);
    ctx.lineTo(width, height * 0.7);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Each environment has its own broad silhouette pattern.
    ctx.fillStyle = palette.shelf;
    if (environment === 1) {
      for (let i = 0; i < 5; i += 1) {
        const x = width * (0.08 + i * 0.22);
        const peak = height * (0.42 + (i % 2) * 0.1);
        ctx.beginPath();
        ctx.moveTo(x - 32, height);
        ctx.lineTo(x, peak);
        ctx.lineTo(x + 32, height);
        ctx.closePath();
        ctx.fill();
      }
    } else if (environment === 2) {
      for (let i = 0; i < 4; i += 1) {
        const shelfY = height * (0.5 + i * 0.1);
        ctx.fillRect(0, shelfY, width, 18);
        ctx.fillRect(width * (0.12 + i * 0.2), shelfY - 18, width * 0.3, 18);
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        const shelfY = height * (0.48 + i * 0.095);
        ctx.beginPath();
        ctx.moveTo(-10, shelfY + 11);
        ctx.lineTo(width * 0.23, shelfY - 3);
        ctx.lineTo(width * 0.5, shelfY + 10);
        ctx.lineTo(width * 0.79, shelfY - 8);
        ctx.lineTo(width + 10, shelfY + 7);
        ctx.lineTo(width + 10, shelfY + 22);
        ctx.lineTo(-10, shelfY + 28);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  },

  drawGround: function (ctx, width, height, groundHeight, offset) {
    ctx.save();
    const top = height - groundHeight;
    ctx.fillStyle = '#111722';
    ctx.fillRect(0, top, width, groundHeight);

    ctx.fillStyle = '#303746';
    ctx.fillRect(0, top, width, 8);
    ctx.strokeStyle = '#080b10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, top + 7);
    ctx.lineTo(width, top + 7);
    ctx.stroke();

    // Offset rock blocks provide a clear scrolling cue.
    const tile = 42;
    const shift = -((offset % tile) + tile);
    for (let x = shift; x < width + tile; x += tile) {
      ctx.fillStyle = '#252c38';
      ctx.fillRect(x + 2, top + 16, tile - 5, 20);
      ctx.fillStyle = '#414957';
      ctx.fillRect(x + 7, top + 39, tile - 12, Math.max(8, groundHeight - 46));
      ctx.strokeStyle = '#0a0d13';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, top + 16, tile - 5, 20);
    }
    ctx.restore();
  },

  drawBird: function (ctx, x, y, size, velocity, skin) {
    ctx.save();
    ctx.translate(x, y);
    const tilt = Math.max(-0.28, Math.min(0.45, velocity / 1200));
    ctx.rotate(tilt);
    const s = size / 34;
    const looks = {
      classic: { body: '#d29a76', pot: '#252a32', dark: '#080a0e', metal: '#b5bdc4' },
      ember: { body: '#f0a15a', pot: '#4e1e24', dark: '#200c11', metal: '#ffd18a' },
      moss: { body: '#9dcc7c', pot: '#243c2a', dark: '#0c1b12', metal: '#c5e2a6' },
      aurora: { body: '#b9a5ff', pot: '#24445a', dark: '#0d1e2b', metal: '#b8f1ff' }
    };
    const look = looks[skin] || looks.classic;

    // The climber's body rises from a black metal cauldron.
    ctx.fillStyle = look.body;
    ctx.strokeStyle = '#17141a';
    ctx.lineWidth = Math.max(2, 2.5 * s);
    ctx.beginPath();
    ctx.ellipse(0, -5 * s, 8.5 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = look.pot;
    ctx.beginPath();
    ctx.ellipse(0, 8.5 * s, 12.5 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = look.dark;
    ctx.beginPath();
    ctx.ellipse(0, 6.5 * s, 9 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // One simple pickaxe crosses behind the shoulders.
    ctx.strokeStyle = '#17141a';
    ctx.lineWidth = Math.max(2, 3 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9 * s, -1 * s);
    ctx.lineTo(9 * s, 5 * s);
    ctx.stroke();
    ctx.strokeStyle = look.metal;
    ctx.lineWidth = Math.max(2, 2 * s);
    ctx.beginPath();
    ctx.moveTo(-10 * s, -4 * s);
    ctx.lineTo(2 * s, -7 * s);
    ctx.stroke();

    ctx.fillStyle = look.pot;
    ctx.beginPath();
    ctx.arc(0, -9 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawPipe: function (ctx, x, gapTop, gapBottom, pipeWidth, height) {
    ctx.save();
    const outline = '#17131b';
    const metal = '#8b5260';
    const highlight = '#c27b79';

    function wall(top, bottom, capAtBottom) {
      const h = Math.max(0, bottom - top);
      if (h <= 0) return;
      ctx.fillStyle = metal;
      ctx.fillRect(x, top, pipeWidth, h);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, top + 1.5, Math.max(0, pipeWidth - 3), Math.max(0, h - 3));
      ctx.fillStyle = highlight;
      ctx.fillRect(x + 7, top + 4, Math.max(3, pipeWidth * 0.18), Math.max(0, h - 8));

      const capHeight = Math.min(14, h);
      const capY = capAtBottom ? bottom - capHeight : top;
      ctx.fillStyle = '#a9636d';
      ctx.fillRect(x - 4, capY, pipeWidth + 8, capHeight);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2.5, capY + 1.5, pipeWidth + 5, Math.max(0, capHeight - 3));
    }

    wall(0, gapTop, true);
    wall(gapBottom, height, false);
    ctx.restore();
  }
};
