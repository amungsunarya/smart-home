from flask import Flask, request, jsonify
import subprocess, os, tempfile, glob

app = Flask(__name__)
SERIAL_PORT_CANDIDATES = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyACM0', '/dev/ttyACM1']

def detect_port():
    for p in SERIAL_PORT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None

@app.route('/flash', methods=['POST'])
def flash():
    if 'firmware' not in request.files:
        return jsonify({'error': 'File firmware tidak ditemukan'}), 400

    file = request.files['firmware']
    offset = request.form.get('offset', '0x10000')

    if not file.filename or not file.filename.endswith('.bin'):
        return jsonify({'error': 'File harus berekstensi .bin'}), 400

    port = detect_port()
    if not port:
        return jsonify({'error': 'ESP32 tidak terdeteksi di server'}), 500

    tmp = os.path.join(tempfile.gettempdir(), file.filename)
    file.save(tmp)

    cmd = [
        'esptool.py', '--chip', 'esp32',
        '--port', port, '--baud', '921600',
        'write_flash', offset, tmp,
    ]

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        ok = r.returncode == 0
        return jsonify({
            'success': ok,
            'port': port,
            'log': r.stdout + '\n' + r.stderr,
        }), (200 if ok else 500)
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Flashing timeout'}), 500
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)