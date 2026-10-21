import json, sys, numpy as np, onnxruntime as ort, wave
vocab = json.load(open('/tmp/claude-0/tts/vocab.json'))
sess = ort.InferenceSession('/tmp/claude-0/tts/kokoro-q8.onnx')
print([ (i.name, i.shape, i.type) for i in sess.get_inputs()], file=sys.stderr)
def synth(ph, voice='af_heart', speed=1.0):
    ids = [vocab[c] for c in ph if c in vocab][:510]
    v = np.fromfile(f'/tmp/claude-0/tts/node_modules/kokoro-js/voices/{voice}.bin', dtype=np.float32).reshape(-1, 256)
    style = v[min(len(ids), v.shape[0]-1)][None, :]
    inp = {sess.get_inputs()[0].name: np.array([[0]+ids+[0]], dtype=np.int64), sess.get_inputs()[1].name: style, sess.get_inputs()[2].name: np.array([speed], dtype=np.float32)}
    return sess.run(None, inp)[0].reshape(-1)
def save(path, a):
    a = np.clip(a, -1, 1); w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes((a*32767).astype(np.int16).tobytes()); w.close()
if __name__ == '__main__':
    phs = json.load(open(sys.argv[1])); voice = sys.argv[3]; speed = float(sys.argv[4])
    for i, p in enumerate(phs):
        a = synth(p, voice, speed); save(f'{sys.argv[2]}/vo{i:02d}.wav', a); print(i, round(len(a)/24000, 2))
