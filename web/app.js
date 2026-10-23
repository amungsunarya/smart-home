// ====== Tab navigation ======
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.hidden = true);
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).hidden = false;
  });
});

// ====== Lampu ======
const statusEl = document.getElementById('conn-status');
const gridEl   = document.getElementById('grid-lampu');
const stateLampu = new Array(8).fill(false);
let client = null;

function buatUI() {
  for (let i = 0; i < 8; i++) {
    const card = document.createElement('div');
    card.className = 'lampu-card';
    card.id = `card-${i + 1}`;
    card.innerHTML = `
      <h2>Lampu ${i + 1}</h2>
      <button class="tombol">MATI</button>`;
    card.querySelector('.tombol').onclick = () => toggleLampu(i + 1);
    gridEl.appendChild(card);
  }
}

function toggleLampu(n) {
  const idx = n - 1;
  const perintah = stateLampu[idx] ? 'OFF' : 'ON';
  if (!client || !client.isConnected()) return alert('MQTT belum terhubung');
  const msg = new Paho.MQTT.Message(perintah);
  msg.destinationName = `lampu/${n}/set`;
  client.send(msg);

  // Optimistic update
  stateLampu[idx] = !stateLampu[idx];
  const card = document.getElementById(`card-${n}`);
  const btn  = card.querySelector('.tombol');
  card.classList.toggle('nyala', stateLampu[idx]);
  btn.textContent = stateLampu[idx] ? 'NYALA' : 'MATI';
}

function initMQTT() {
  const host = window.location.host;        // e.g. "smarthome.local"
  const wsUrl = `wss://${host}/mqtt`;       // lewat reverse proxy nginx
  const clientId = 'web-' + Math.random().toString(16).slice(2, 10);
  client = new Paho.MQTT.Client(wsUrl, clientId);

  client.onConnectionLost = r => {
    statusEl.textContent = 'Terputus';
    statusEl.className = 'badge err';
  };
  client.connect({
    onSuccess: () => {
      statusEl.textContent = '✅ Online';
      statusEl.className = 'badge ok';
    },
    onFailure: e => {
      statusEl.textContent = '❌ Gagal';
      statusEl.className = 'badge err';
      console.error(e);
    },
    useSSL: true,
    timeout: 5,
  });
}

// ====== Flasher ======
document.getElementById('btn-flash').addEventListener('click', async (e) => {
  const file   = document.getElementById('firmware').files[0];
  const offset = document.getElementById('offset').value.trim();
  const logEl  = document.getElementById('flash-log');

  if (!file) return alert('Pilih file firmware terlebih dahulu');
  if (!file.name.endsWith('.bin')) return alert('File harus .bin');

  const fd = new FormData();
  fd.append('firmware', file);
  fd.append('offset', offset);

  e.target.disabled = true;
  logEl.textContent = 'Memproses… Jangan cabut ESP32.';

  try {
    const r = await fetch('/api/flash', { method: 'POST', body: fd });
    const data = await r.json();
    logEl.textContent = data.log || data.error || 'Selesai';
  } catch (err) {
    logEl.textContent = 'Error: ' + err.message;
  } finally {
    e.target.disabled = false;
  }
});

// ====== Bootstrap ======
buatUI();
initMQTT();

// ====== Register service worker (PWA) ======
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}