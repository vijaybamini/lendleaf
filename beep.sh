#!/bin/bash
# Quick 50ms beep notification
python3 << 'EOF'
import wave, struct, os
wav = wave.open('/tmp/beep.wav', 'w')
wav.setnchannels(1)
wav.setsampwidth(2)
wav.setframerate(8000)
wav.writeframes(b''.join(struct.pack('<h', int(32767*0.3*__import__('math').sin(2*__import__('math').pi*1000*i/8000))) for i in range(8000)))
wav.close()
os.system('aplay /tmp/beep.wav 2>/dev/null')
EOF
