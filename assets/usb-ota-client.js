class SerialUpdateSession {
  constructor(port) {
    this.port = port;
    this.reader = port.readable.getReader();
    this.writer = port.writable.getWriter();
    this.decoder = new TextDecoder();
    this.buffer = '';
    this.lines = [];
  }
  async write(data) {
    await this.writer.write(typeof data === 'string' ? new TextEncoder().encode(data + '\n') : data);
  }
  async response(matches, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (true) {
      while (this.lines.length) {
        const line = this.lines.shift();
        if (line.startsWith('MAYDAY_OTA|ERROR=')) throw new Error(line.slice(17));
        if (matches(line)) return line;
      }
      let timer;
      let next;
      try {
        next = await Promise.race([
          this.reader.read(),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('USB_TIMEOUT')), Math.max(0, deadline - Date.now())); })
        ]);
      } finally { clearTimeout(timer); }
      if (next.done) throw new Error('USB_DISCONNECTED');
      this.buffer += this.decoder.decode(next.value, {stream: true});
      const lines = this.buffer.split(/\r?\n/);
      this.buffer = (lines.pop() || '').slice(-4096);
      this.lines.push(...lines.filter(line => line.startsWith('MAYDAY_OTA|')));
      if (this.lines.length > 32) throw new Error('USB_PROTOCOL');
    }
  }
  async release(reopen = true) {
    try { await this.reader.cancel(); } catch {}
    this.reader.releaseLock();
    this.writer.releaseLock();
    if (reopen) {
      await this.port.close();
      await this.port.open({baudRate: 115200, bufferSize: 8192});
    }
  }
}
const fields = line => Object.fromEntries(line.split('|').slice(2).map(part => {
  const at = part.indexOf('=');
  return [part.slice(0, at), part.slice(at + 1)];
}));

export async function stageUsbFirmware(port, release, device, progress = () => {}, options = {}) {
  if (!device.usbOta || !device.target || device.running === device.target ||
      !release.appBytes || release.appBytes.length > device.size || !release.build) {
    throw new Error('USB_UPDATE_UNSUPPORTED');
  }
  const bytes = release.appBytes;
  progress(null, {phase: 'hashing', sent: 0, total: bytes.length});
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const sha256 = [...hash].map(value => value.toString(16).padStart(2, '0')).join('');
  const session = new SerialUpdateSession(port);
  let boundary = true;
  let stagedComplete = false;
  let wantsDevicePrompt = !!device.devicePrompt;
  let rebooting = false;
  try {
    progress(null, {phase: 'preparing', sent: 0, total: bytes.length});
    await session.write('MAYDAY_OTA_BEGIN|SIZE=' + bytes.length + '|SHA256=' + sha256 +
      '|APP=' + release.version + '|FW=' + release.build);
    const ready = fields(await session.response(line => line.startsWith('MAYDAY_OTA|READY|'), 30000));
    if (ready.TARGET !== device.target || Number(ready.SIZE) !== bytes.length) throw new Error('USB_TARGET_CHANGED');
    const advertisedChunk = Number(ready.CHUNK || device.chunkSize || 128);
    if (!Number.isInteger(advertisedChunk) || advertisedChunk < 1 || advertisedChunk > 4096) throw new Error('USB_CHUNK_INVALID');
    const chunkSize = Math.min(advertisedChunk, 1024);
    wantsDevicePrompt = wantsDevicePrompt || ready.DEVICE_PROMPT === '1';
    for (let offset = 0; offset < bytes.length;) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      boundary = false;
      await session.write('MAYDAY_OTA_DATA|OFFSET=' + offset + '|SIZE=' + chunk.length);
      await session.write(chunk);
      const ack = await session.response(line => line.startsWith('MAYDAY_OTA|ACK='));
      offset += chunk.length;
      if (Number(ack.slice('MAYDAY_OTA|ACK='.length)) !== offset) throw new Error('USB_ACK_MISMATCH');
      boundary = true;
      progress(Math.round(offset * 1000 / bytes.length) / 10, {phase: 'writing', sent: offset, total: bytes.length});
    }
    progress(null, {phase: 'verifying', sent: bytes.length, total: bytes.length});
    const deviceAutoBoot = options.autoRestart && ready.AUTO_BOOT === '1';
    await session.write(deviceAutoBoot ? 'MAYDAY_OTA_END_AUTO' : 'MAYDAY_OTA_END');
    const staged = fields(await session.response(line => line.startsWith('MAYDAY_OTA|STAGED|'), 30000));
    if (staged.TARGET !== device.target || staged.APP !== release.version || staged.FW !== release.build) {
      throw new Error('USB_STAGED_MISMATCH');
    }
    stagedComplete = true;
    if (options.autoRestart) {
      if (!deviceAutoBoot) await session.write('MAYDAY_OTA_BOOT');
      await session.response(line => line === 'MAYDAY_OTA|REBOOTING');
      rebooting = true;
    }
    return {...staged, devicePrompt: wantsDevicePrompt, rebooting};
  } catch (error) {
    if (boundary) {
      try { await session.write('MAYDAY_OTA_ABORT'); } catch {}
    }
    throw error;
  } finally {
    await session.release(!(stagedComplete && (wantsDevicePrompt || options.autoRestart)));
  }
}
export async function decideUsbFirmware(port, reboot) {
  const session = new SerialUpdateSession(port);
  let confirmed = false;
  try {
    await session.write(reboot ? 'MAYDAY_OTA_BOOT' : 'MAYDAY_OTA_DEFER');
    const expected = reboot ? 'MAYDAY_OTA|REBOOTING' : 'MAYDAY_OTA|DEFERRED';
    await session.response(line => line === expected);
    confirmed = true;
  } finally {
    await session.release(!confirmed);
  }
}
