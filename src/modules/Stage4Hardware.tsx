// ── Stage 4: Hardware Connection Guide ──
// Photo matching + Board reference + Dashboard guide + Flashing + WiFi/Device Status + Manus prompt

import { useState, useEffect, useRef } from 'react';
import { ALL_COMPONENTS } from '../data/sensors';

// ══════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════

const PHOTO_MAP: Record<string, string> = {
  dht11: '온습도 센서.png',
  ultrasonic: '초음파 거리 센서.png',
  cds: '조도 센서.png',
  soil: '토양 수분 센서.png',
  gas: '가스 센서.png',
  ds18b20: '방수 온도 센서.png',
  potentiometer: '가변 저항.png',
  tilt: '틸트 센서.png',
  touch: '터치 센서.png',
  button: '버튼.png',
  buzzer: '부저.png',
  servo: '서보 모터.png',
  oled: 'OLED 디스플레이.png',
  neopixel: 'NeoPixel LED.png',
  dcmotor: 'DC모터.png',
  fanmotor: '팬모터(L9110).png',
};

const NO_PHOTO_KEYS: string[] = [];

const STEP_LABELS = ['사진 맞추기', '보드 확인', '대시보드 생성기', '펌웨어 업로드', 'WiFi & MQTT', 'Manus 가이드'];

const MANUS_PROMPT = `ESP32-S3-MOC 보드에 연결된 센서와 액추에이터를 활용하여 인터랙티브한 웹 대시보드를 만들어주세요. 대시보드는 실시간 센서 데이터 시각화, 액추에이터 제어 기능, 그리고 흥미로운 스토리텔링 요소가 포함되어야 합니다.`;

const MANUS_REQUIREMENTS = [
  'HTML, 자바스크립트, CSS 사용',
  '브래킷 연결, 브래킷 연결 취소 버튼 생성',
  '애니메이션으로 제작',
  '배경도 스토리텔링 배경으로 제작',
  '자신만의 센서와 액추에이터로 스토리텔링 작성',
];

// ══════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════

function photoUrl(key: string): string {
  const filename = PHOTO_MAP[key];
  if (!filename) return '';
  return `/photos/${encodeURIComponent(filename)}`;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}

// ══════════════════════════════════════════════════════
// Step Indicator
// ══════════════════════════════════════════════════════

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2, marginBottom: 24,
      overflowX: 'auto', padding: '12px 16px',
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
    }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64,
            opacity: i <= current ? 1 : 0.4,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700,
              background: i < current ? 'var(--accent-green-dim)' : i === current ? 'var(--accent-blue)' : 'var(--bg-input)',
              border: `2px solid ${i < current ? 'var(--accent-green)' : i === current ? 'var(--accent-blue)' : 'var(--border)'}`,
              color: i <= current ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s ease',
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: '0.62rem', whiteSpace: 'nowrap', fontWeight: i === current ? 600 : 400,
              color: i === current ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}>
              {labels[i]}
            </span>
          </div>
          {i < total - 1 && (
            <div style={{
              width: 16, height: 2, margin: '0 2px', marginBottom: 16,
              background: i < current ? 'var(--accent-green)' : 'var(--border)',
              transition: 'background 0.2s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Step 0: Photo Matching Game
// ══════════════════════════════════════════════════════

function PhotoMatching({ onComplete }: { onComplete: () => void }) {
  const componentsWithPhotos = ALL_COMPONENTS.filter((c) => !NO_PHOTO_KEYS.includes(c.key));
  const [photos] = useState(() => shuffle(componentsWithPhotos));
  const [names] = useState(() => shuffle(componentsWithPhotos));
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const [wrongName, setWrongName] = useState<string | null>(null);

  const allMatched = matched.size === componentsWithPhotos.length;

  useEffect(() => {
    if (!wrongKey) return;
    const timer = setTimeout(() => { setWrongKey(null); setWrongName(null); }, 800);
    return () => clearTimeout(timer);
  }, [wrongKey]);

  function handleNameClick(key: string) {
    if (matched.has(key)) return;
    setSelectedName(key);
  }

  function handlePhotoClick(key: string) {
    if (matched.has(key) || !selectedName) return;

    if (key === selectedName) {
      setMatched((prev) => new Set([...prev, key]));
      setSelectedName(null);
    } else {
      setWrongKey(key);
      setWrongName(selectedName);
      setSelectedName(null);
    }
  }

  return (
    <div>
      <div className="info-box info-box--blue" style={{ marginBottom: 16 }}>
        <div className="info-box__title">📸 게임 설명</div>
        <p>아래 이름 칩 중 하나를 클릭하여 선택한 후, 올바른 사진을 클릭하세요. 16개를 모두 맞추면 다음 단계로 진행합니다!</p>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        맞춘 수: {matched.size} / {componentsWithPhotos.length}
      </div>

      {/* Name chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {names.map((comp) => {
          const isMatched = matched.has(comp.key);
          const isSelected = selectedName === comp.key;
          const isWrong = wrongName === comp.key;
          return (
            <button
              key={comp.key}
              onClick={() => handleNameClick(comp.key)}
              disabled={isMatched}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600,
                cursor: isMatched ? 'default' : 'pointer', transition: 'all 0.2s ease',
                background: isMatched ? 'rgba(61,214,140,0.1)' : isSelected ? 'var(--accent-blue)' : isWrong ? 'var(--accent-red)' : 'var(--bg-input)',
                color: isMatched ? 'var(--accent-green)' : isSelected ? 'white' : isWrong ? 'white' : 'var(--text-secondary)',
                border: `2px solid ${isMatched ? 'var(--accent-green)' : isSelected ? 'var(--accent-blue)' : isWrong ? 'var(--accent-red)' : 'var(--border)'}`,
                opacity: isMatched ? 0.4 : 1,
                textDecoration: isMatched ? 'line-through' : 'none',
              }}
            >
              {comp.emoji} {comp.name}
            </button>
          );
        })}
      </div>

      {/* Photo grid */}
      <div className="grid grid--3">
        {photos.map((comp) => {
          const isMatched = matched.has(comp.key);
          const isWrong = wrongKey === comp.key;
          const isSelectable = selectedName && !isMatched;
          return (
            <div
              key={comp.key}
              onClick={() => handlePhotoClick(comp.key)}
              style={{
                border: `2px solid ${isMatched ? 'var(--accent-green)' : isWrong ? 'var(--accent-red)' : isSelectable ? 'var(--accent-yellow)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', padding: 8, cursor: isMatched ? 'default' : 'pointer',
                transition: 'all 0.2s ease', position: 'relative',
                background: isMatched ? 'rgba(61,214,140,0.05)' : isWrong ? 'rgba(255,107,107,0.05)' : 'var(--bg-card)',
                boxShadow: isWrong ? '0 0 12px rgba(255,107,107,0.3)' : 'none',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: 100 }}>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', background: 'var(--bg-input)', borderRadius: 8,
                }}>
                  {comp.emoji}
                </div>
                <img
                  src={photoUrl(comp.key)}
                  alt={comp.name}
                  style={{ position: 'relative', width: '100%', height: 100, objectFit: 'contain', borderRadius: 8 }}
                />
              </div>
              {isMatched && (
                <div style={{ textAlign: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-green)' }}>
                    ✓ {comp.name}
                  </span>
                </div>
              )}
              {isWrong && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--accent-red)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 700,
                }}>✗</div>
              )}
            </div>
          );
        })}
      </div>

      {allMatched && (
        <div className="info-box info-box--green" style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
          <div className="info-box__title">모두 맞추셨어요!</div>
          <p>16개 센서와 액추에이터를 모두 잘 아셨어요!</p>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn--success" onClick={onComplete}>다음 단계로 →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Step 1: Board Reference
// ══════════════════════════════════════════════════════

function BoardReference({ onComplete }: { onComplete: () => void }) {
  return (
    <div>
      <div className="info-box info-box--blue" style={{ marginBottom: 16 }}>
        <div className="info-box__title">🔍 ESP32-S3-MOC 보드 실물 확인</div>
        <p>아래 사진은 실제 ESP32-S3-MOC 보드의 모습입니다. 앞쪽에서 배운 포트, 핀 헤더, 안테나, ESP32-S3 칩을 찾아보세요!</p>
      </div>

      <div className="grid grid--2">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card__header" style={{ justifyContent: 'center' }}>
            <div>
              <div className="card__title">ESP32-S3-MOC 보드</div>
              <div className="card__subtitle">전체 모습</div>
            </div>
          </div>
          <img
            src="/photos/ESP32-S3-MOC.png"
            alt="ESP32-S3-MOC 보드"
            style={{ width: '100%', borderRadius: 'var(--radius-md)', marginTop: 8 }}
          />
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card__header" style={{ justifyContent: 'center' }}>
            <div>
              <div className="card__title">보드 설명</div>
              <div className="card__subtitle">각 부분 이름 표시</div>
            </div>
          </div>
          <img
            src={`/photos/${encodeURIComponent('ESP32-S3-MOC-설명.png')}`}
            alt="ESP32-S3-MOC 보드 설명"
            style={{ width: '100%', borderRadius: 'var(--radius-md)', marginTop: 8 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button className="btn btn--success" onClick={onComplete}>다음 단계로 →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Step 2: Dashboard Generator Guide
// ══════════════════════════════════════════════════════

function DashboardGuide({ onComplete }: { onComplete: () => void }) {
  const steps = [
    {
      emoji: '🖥️',
      title: '대시보드 생성기 실행',
      desc: '"ESP32 대시보드 생성기" exe 파일을 더블클릭하여 실행합니다. 생성기 내부에 MQTT 브로커가 내장되어 있어 별도의 서버 설치가 필요 없습니다.',
    },
    {
      emoji: '⚙️',
      title: '사전 요구사항 확인',
      desc: 'Node.js, Python, PlatformIO가 설치되어 있는지 자동으로 확인합니다. 모두 설치되어 있어야 다음 단계로 넘어갈 수 있습니다.',
    },
    {
      emoji: '✅',
      title: '센서/액추에이터 선택',
      desc: '사용할 센서와 액추에이터를 카드를 클릭하여 선택합니다. 같은 센서를 여러 개 사용할 수 있고, 핀번호는 자동으로 할당됩니다. 선택하면 배선 가이드도 자동으로 표시됩니다.',
    },
    {
      emoji: '🤖',
      title: 'AI 기능 설정 (선택사항)',
      desc: 'Huskylens(AI 비전 센서)나 Teachable Machine(AI 이미지/소리 분류)을 선택적으로 설정할 수 있습니다. 필요 없으면 건너뛰면 됩니다.',
    },
    {
      emoji: '📋',
      title: '프로젝트 설정',
      desc: '프로젝트 이름과 저장 위치를 정하고, 센서 측정 주기(예: 1초마다 측정)를 설정합니다. NeoPixel을 선택한 경우 매트릭스 크기도 설정합니다.',
    },
    {
      emoji: '🚀',
      title: '대시보드 생성',
      desc: '"대시보드 생성" 버튼을 누르면 펌웨어와 대시보드가 자동으로 생성됩니다. 완성된 exe 파일을 실행하면 실시간 센서 데이터를 볼 수 있고, 스마트폰에서도 접속할 수 있습니다!',
    },
  ];

  return (
    <div>
      <div className="info-box info-box--blue" style={{ marginBottom: 16 }}>
        <div className="info-box__title">📱 대시보드 생성기 사용 방법</div>
        <p>ESP32 대시보드 생성기를 사용하면 코딩 없이 메뉴를 선택하는 것만으로 센서 데이터를 시각화하는 대시보드를 만들 수 있습니다. MQTT 토픽과 핀번호는 모두 자동으로 생성됩니다!</p>
      </div>

      {steps.map((step, i) => (
        <div key={i} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-input)', border: '2px solid var(--accent-blue)',
            fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)',
          }}>
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {step.emoji} {step.title}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {step.desc}
            </div>
          </div>
        </div>
      ))}

      <div className="info-box info-box--yellow" style={{ marginTop: 16 }}>
        <div className="info-box__title">💡 생성된 대시보드의 주요 기능</div>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, margin: 0 }}>
          <li>📊 실시간 센서 데이터 시각화 (게이지, 차트)</li>
          <li>🎮 액추에이터 제어 패널 (모터, 부저, LED 등)</li>
          <li>📚 교육 자료 패널 (배선 가이드, 센서 백과사전)</li>
          <li>📱 스마트폰 연결 (QR 코드로 접속)</li>
          <li>⚡ 펌웨어 업로드 기능 (USB로 ESP32에 코드 업로드)</li>
        </ul>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button className="btn btn--success" onClick={onComplete}>다음 단계로 →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Step 3: Firmware Upload (Settings → Firmware Update)
// ══════════════════════════════════════════════════════

function FlashingSim({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startFlashing() {
    if (flashing || done) return;
    setFlashing(true);
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setFlashing(false);
          setDone(true);
          return 100;
        }
        return prev + 2;
      });
    }, 60);
  }

  const statusMessage = done
    ? '✅ 펌웨어 플래시 완료! ESP32가 재시작합니다.'
    : flashing
      ? progress < 30
        ? '플래시 준비 중... ' + progress + '%'
        : progress < 70
          ? '펌웨어 업로드 중... ' + progress + '%'
          : '검증 및 리부팅 중... ' + progress + '%'
      : '⚙️ Settings 모달의 "Firmware Update"에서 "플래시" 버튼을 클릭하세요.';

  return (
    <div>
      <div className="info-box info-box--blue" style={{ marginBottom: 16 }}>
        <div className="info-box__title">⚡ 대시보드에서 펌웨어 업로드</div>
        <p>생성된 대시보드의 ⚙️ Settings 버튼을 누르면 Settings 모달이 열립니다. "Firmware Update" 섹션에서 ESP32에 펌웨어를 업로드할 수 있습니다. USB-C 케이블로 노트북과 ESP32를 연결해야 합니다.</p>
      </div>

      {/* Mock dashboard Settings modal */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', background: 'var(--bg-input)',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '0.9rem' }}>⚙️</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Settings</span>
        </div>

        <div style={{ padding: 20 }}>
          {/* Firmware Update section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: '0.85rem' }}>🔌</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Firmware Update</span>
          </div>

          {/* Firmware info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, paddingLeft: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>현재 펌웨어</span>
              <code style={{ color: done ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                {done ? '1.0.0 (0711_01)' : '—'}
              </code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>번들 펌웨어</span>
              <code style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>1.0.0 (0711_01)</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>빌드 시각</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>2025-07-11 10:30:00</span>
            </div>
          </div>

          {/* Progress bar */}
          {(flashing || done) && (
            <div style={{
              width: '100%', height: 24, background: 'var(--bg-input)',
              borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)',
              marginBottom: 12,
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: done ? 'var(--accent-green)' : 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
                transition: 'width 0.06s linear', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700, color: 'white',
              }}>
                {progress > 10 ? `${progress}%` : ''}
              </div>
            </div>
          )}

          {/* Status message */}
          <div style={{
            fontSize: '0.85rem',
            color: done ? 'var(--accent-green)' : 'var(--text-secondary)',
            marginBottom: 16,
          }}>
            {statusMessage}
          </div>

          {/* Action button */}
          <div>
            {!done ? (
              <button
                className="btn btn--primary"
                onClick={startFlashing}
                disabled={flashing}
                style={{ background: '#ff7849' }}
              >
                {flashing ? '플래시 중...' : '⚡ 플래시'}
              </button>
            ) : (
              <button className="btn btn--success" onClick={onComplete}>다음 단계로 →</button>
            )}
          </div>
        </div>
      </div>

      {/* USB-C reminder */}
      <div className="info-box info-box--yellow" style={{ marginTop: 16 }}>
        <div className="info-box__title">⚠️ USB-C 케이블 확인</div>
        <p>펌웨어 업로드는 USB-C 케이블로 노트북과 ESP32를 연결해야 합니다. 데이터 전송용 케이블(단순 충전 전용이 아닌)이어야 합니다.</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Step 4: WiFi & MQTT Connection (Settings → Serial + WiFi + ConnectionBar)
// ══════════════════════════════════════════════════════

type WiFiPhase =
  | 'serial_idle'
  | 'serial_connecting'
  | 'serial_connected'
  | 'wifi_scanning'
  | 'wifi_list'
  | 'wifi_selected'
  | 'wifi_saving'
  | 'wifi_waiting'
  | 'esp32_connected'
  | 'mqtt_connecting'
  | 'mqtt_connected';

const MOCK_NETWORKS = [
  { ssid: 'MyHomeWiFi', rssi: -45, encrypted: true },
  { ssid: 'GuestWiFi', rssi: -62, encrypted: true },
  { ssid: 'LG_Smart_5G', rssi: -71, encrypted: true },
  { ssid: 'OpenWiFi', rssi: -80, encrypted: false },
];

function WiFiConnection({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<WiFiPhase>('serial_idle');
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showReplugWarning, setShowReplugWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Serial connecting → connected
  useEffect(() => {
    if (phase !== 'serial_connecting') return;
    timerRef.current = setTimeout(() => setPhase('serial_connected'), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase]);

  // WiFi scanning → list
  useEffect(() => {
    if (phase !== 'wifi_scanning') return;
    timerRef.current = setTimeout(() => setPhase('wifi_list'), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase]);

  // WiFi saving → waiting
  useEffect(() => {
    if (phase !== 'wifi_saving') return;
    timerRef.current = setTimeout(() => setPhase('wifi_waiting'), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase]);

  // WiFi waiting → show replug warning after 5s, then connect
  useEffect(() => {
    if (phase !== 'wifi_waiting') return;
    const warnTimer = setTimeout(() => setShowReplugWarning(true), 5000);
    const connectTimer = setTimeout(() => {
      setPhase('esp32_connected');
      setShowReplugWarning(false);
    }, 7000);
    return () => {
      clearTimeout(warnTimer);
      clearTimeout(connectTimer);
    };
  }, [phase]);

  // MQTT connecting → connected
  useEffect(() => {
    if (phase !== 'mqtt_connecting') return;
    timerRef.current = setTimeout(() => setPhase('mqtt_connected'), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase]);

  function statusBadge(state: 'ok' | 'err' | 'checking' | 'idle', label: string) {
    const colors = {
      ok: { bg: 'rgba(61,214,140,0.15)', color: 'var(--accent-green)', text: '✓' },
      err: { bg: 'rgba(255,107,107,0.15)', color: 'var(--accent-red)', text: '✗' },
      checking: { bg: 'rgba(245,205,71,0.15)', color: 'var(--accent-yellow)', text: '…' },
      idle: { bg: 'var(--bg-input)', color: 'var(--text-muted)', text: '—' },
    };
    const c = colors[state];
    return (
      <span style={{
        padding: '3px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600,
        background: c.bg, color: c.color,
      }}>
        {label} {c.text}
      </span>
    );
  }

  const wifiState: 'ok' | 'err' | 'checking' | 'idle' =
    phase === 'wifi_waiting' ? 'checking' :
    phase === 'esp32_connected' || phase === 'mqtt_connecting' || phase === 'mqtt_connected' ? 'ok' :
    'idle';

  const mqttState: 'ok' | 'err' | 'checking' | 'idle' =
    phase === 'wifi_waiting' ? 'checking' :
    phase === 'esp32_connected' || phase === 'mqtt_connecting' || phase === 'mqtt_connected' ? 'ok' :
    'idle';

  return (
    <div>
      <div className="info-box info-box--blue" style={{ marginBottom: 16 }}>
        <div className="info-box__title">📶 WiFi & MQTT 연결</div>
        <p>펌웨어 업로드가 완료되면, Settings 모달에서 ESP32를 USB로 연결하고 WiFi를 설정합니다. 그 다음 대시보드의 "연결" 버튼으로 MQTT 브로커에 연결합니다.</p>
      </div>

      {/* Settings Modal (phases: serial → wifi) */}
      {phase !== 'mqtt_connecting' && phase !== 'mqtt_connected' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.9rem' }}>⚙️</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Settings</span>
          </div>

          <div style={{ padding: 20 }}>
            {/* Serial Port section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem' }}>🔌</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Serial Port</span>
            </div>

            {(phase === 'serial_idle' || phase === 'serial_connecting') && (
              <button
                className="btn btn--primary"
                onClick={() => setPhase('serial_connecting')}
                disabled={phase === 'serial_connecting'}
                style={{ marginBottom: 16, fontSize: '0.85rem' }}
              >
                {phase === 'serial_connecting' ? '연결 중...' : '🔌 ESP32 연결'}
              </button>
            )}

            {phase !== 'serial_idle' && phase !== 'serial_connecting' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>✓ 시리얼 연결됨</span>
                  {statusBadge(wifiState, 'WiFi')}
                  {statusBadge(mqttState, 'MQTT')}
                </div>

                {/* WiFi Configuration section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <span style={{ fontSize: '0.85rem' }}>📶</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>WiFi Configuration</span>
                </div>

                {(phase === 'serial_connected') && (
                  <button
                    className="btn btn--primary"
                    onClick={() => setPhase('wifi_scanning')}
                    style={{ marginBottom: 16, fontSize: '0.85rem' }}
                  >
                    📶 WiFi 스캔
                  </button>
                )}

                {phase === 'wifi_scanning' && (
                  <div style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ animation: 'pulse 1s ease infinite' }}>🔍 WiFi 스캔 중...</span>
                  </div>
                )}

                {phase === 'wifi_list' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {MOCK_NETWORKS.map((net) => (
                        <button
                          key={net.ssid}
                          onClick={() => { setSelectedSsid(net.ssid); setPhase('wifi_selected'); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>📶</span>
                          <span style={{ flex: 1, textAlign: 'left' }}>{net.ssid}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{net.rssi} dBm</span>
                          {net.encrypted && <span>🔒</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {phase === 'wifi_selected' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SSID</label>
                        <input
                          type="text"
                          value={selectedSsid}
                          onChange={(e) => setSelectedSsid(e.target.value)}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', fontSize: '0.85rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="WiFi 비밀번호"
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', fontSize: '0.85rem',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Broker IP</label>
                        <input
                          type="text"
                          value="192.168.1.100"
                          readOnly
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--accent-cyan)', fontSize: '0.85rem',
                          }}
                        />
                      </div>
                      <button
                        className="btn btn--primary"
                        onClick={() => setPhase('wifi_saving')}
                        disabled={!selectedSsid}
                        style={{ background: '#14c6cb', fontSize: '0.85rem', marginTop: 4 }}
                      >
                        ESP32에 설정 저장
                      </button>
                    </div>
                  </div>
                )}

                {(phase === 'wifi_saving' || phase === 'wifi_waiting' || phase === 'esp32_connected') && (
                  <div style={{ marginBottom: 16 }}>
                    {phase === 'wifi_saving' && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span style={{ animation: 'pulse 1s ease infinite' }}>설정 저장 중...</span>
                      </div>
                    )}
                    {phase === 'wifi_waiting' && (
                      <div>
                        <div style={{
                          padding: 12, borderRadius: 'var(--radius-md)',
                          background: 'rgba(245,205,71,0.08)',
                          border: '1px solid rgba(245,205,71,0.3)',
                          marginBottom: 12,
                        }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-yellow)' }}>
                            저장됨 — WiFi 연결 대기 중...
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            ESP32가 WiFi와 MQTT 브로커에 연결하는 데 시간이 조금 걸립니다.
                          </div>
                        </div>
                        {showReplugWarning && (
                          <div className="info-box info-box--red" style={{ marginTop: 8 }}>
                            <div className="info-box__title">⚠️ 주의: USB 케이블을 다시 연결해주세요!</div>
                            <p>만약 상태가 오랫동안 "연결 대기 중"으로 남아 있다면,
                              <strong> USB 케이블을 노트북에서 뺐다가 다시 꽂아주세요!</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {phase === 'esp32_connected' && (
                      <div style={{
                        padding: 12, borderRadius: 'var(--radius-md)',
                        background: 'rgba(61,214,140,0.08)',
                        border: '1px solid rgba(61,214,140,0.3)',
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-green)', marginBottom: 6 }}>
                          ✅ ESP32가 WiFi와 MQTT에 연결되었습니다!
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          IP: 192.168.1.100 · WiFi: {selectedSsid || 'MyHomeWiFi'} · MQTT: 연결됨
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ConnectionBar (MQTT connect phase) */}
      {(phase === 'esp32_connected' || phase === 'mqtt_connecting' || phase === 'mqtt_connected') && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
          }}>
            <span style={{ fontSize: '0.85rem' }}>🖥️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MQTT WebSocket Broker</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ws://192.168.1.100:9001</div>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: phase === 'mqtt_connected' ? 'var(--accent-green)' : phase === 'mqtt_connecting' ? 'var(--accent-yellow)' : 'var(--text-muted)',
              animation: phase === 'mqtt_connecting' ? 'pulse 1s ease infinite' : 'none',
            }} />
            <span style={{
              fontSize: '0.8rem', fontWeight: 600,
              color: phase === 'mqtt_connected' ? 'var(--accent-green)' : phase === 'mqtt_connecting' ? 'var(--accent-yellow)' : 'var(--text-muted)',
            }}>
              {phase === 'mqtt_connected' ? '연결됨' : phase === 'mqtt_connecting' ? '연결 중…' : '연결 안됨'}
            </span>
            {phase === 'esp32_connected' && (
              <button
                className="btn btn--primary"
                onClick={() => setPhase('mqtt_connecting')}
                style={{ fontSize: '0.82rem' }}
              >
                연결
              </button>
            )}
          </div>
        </div>
      )}

      {/* Device Status panel (mqtt_connected) */}
      {phase === 'mqtt_connected' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem' }}>📊</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Device Status</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['Status', 'online', 'var(--accent-green)'],
              ['Broker', '192.168.1.100:9001', 'var(--text-secondary)'],
              ['Device', 'online', 'var(--accent-green)'],
              ['Topic', 'esp32/#', 'var(--text-secondary)'],
              ['Firmware', '1.0.0 (0711_01)', 'var(--accent-cyan)'],
            ].map(([key, value, color]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{key}</span>
                <span style={{ color: color as string, fontFamily: key === 'Firmware' || key === 'Broker' || key === 'Topic' ? 'monospace' : 'inherit' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success + next button */}
      {phase === 'mqtt_connected' && (
        <>
          <div className="info-box info-box--green">
            <div className="info-box__title">🎉 대시보드와 ESP32가 연결되었습니다!</div>
            <p>이제 대시보드에서 센서 데이터를 실시간으로 볼 수 있습니다. 다음 단계에서는 Manus 프롬프트를 사용하여 나만의 대시보드를 만드는 방법을 알아보겠습니다.</p>
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button className="btn btn--success btn--lg" onClick={onComplete}>다음 단계로 →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Step 5: Manus Prompt Guide
// ══════════════════════════════════════════════════════

function ManusPrompt({ onComplete }: { onComplete: () => void }) {
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  async function handleCopy() {
    const success = await copyToClipboard(MANUS_PROMPT);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function toggleCheck(index: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const allChecked = checkedItems.size === MANUS_REQUIREMENTS.length;

  return (
    <div>
      <div className="info-box info-box--blue" style={{ marginBottom: 16 }}>
        <div className="info-box__title">🤖 Manus 프롬프트로 나만의 대시보드 만들기</div>
        <p>ESP32가 연결되었으니, 이제 Manus(마누스) AI를 사용하여 나만의 자동화 대시보드를 만들어보겠습니다. 아래 지시대로 따라해주세요.</p>
      </div>

      {/* Prompt box */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>📋 대시보드 프롬프트</div>
          <button
            className={`btn ${copied ? 'btn--success' : 'btn--ghost'}`}
            onClick={handleCopy}
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            {copied ? '✓ 복사됨!' : '📋 프롬프트 복사'}
          </button>
        </div>
        <div style={{
          padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}>
          {MANUS_PROMPT}
        </div>
      </div>

      {/* Instructions */}
      <div className="info-box info-box--yellow" style={{ marginBottom: 16 }}>
        <div className="info-box__title">📝 사용 순서</div>
        <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>Manus(마누스)를 열고 새 메시지를 시작합니다.</li>
          <li>위에서 복사한 프롬프트를 붙여넣습니다 (Ctrl+V).</li>
          <li><strong>SHIFT + ENTER</strong>를 눌러서 줄바꿈을 합니다.</li>
          <li>아래 5가지 요구 사항을 추가로 입력합니다:</li>
        </ol>
      </div>

      {/* Requirements checklist */}
      <div className="card">
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          ✅ 추가로 입력할 5가지 요구 사항
        </div>
        {MANUS_REQUIREMENTS.map((req, i) => (
          <div
            key={i}
            onClick={() => toggleCheck(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', marginBottom: 8,
              background: checkedItems.has(i) ? 'rgba(61,214,140,0.08)' : 'var(--bg-input)',
              border: `2px solid ${checkedItems.has(i) ? 'var(--accent-green)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: checkedItems.has(i) ? 'var(--accent-green-dim)' : 'transparent',
              border: `2px solid ${checkedItems.has(i) ? 'var(--accent-green)' : 'var(--border)'}`,
              color: 'white', fontSize: '0.85rem', fontWeight: 700,
            }}>
              {checkedItems.has(i) ? '✓' : ''}
            </div>
            <span style={{
              fontSize: '0.95rem', color: checkedItems.has(i) ? 'var(--accent-green)' : 'var(--text-secondary)',
              textDecoration: checkedItems.has(i) ? 'line-through' : 'none',
            }}>
              {i + 1}. {req}
            </span>
          </div>
        ))}
      </div>

      {allChecked && (
        <div className="info-box info-box--green" style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
          <div className="info-box__title">모든 요구 사항을 확인했어요!</div>
          <p>Manus에서 대시보드가 완성되면 이제 당신만의 IoT 스토리를 만들어보세요!</p>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn--success btn--lg" onClick={onComplete}>
              ✅ 스테이지 4 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════

interface Stage4Props {
  onComplete: () => void;
}

export function Stage4Hardware({ onComplete }: Stage4Props) {
  const [step, setStep] = useState(0);

  return (
    <div className="stage">
      <h2 className="stage__title">
        <span>🔌</span> 실제 하드웨어 연결 가이드
      </h2>
      <p className="stage__description">
        시뮬레이션을 완료했다면, 이제 실제 ESP32-S3-MOC 키트로 실습해 보세요!
      </p>

      <StepIndicator current={step} total={6} labels={STEP_LABELS} />

      {step === 0 && <PhotoMatching onComplete={() => setStep(1)} />}
      {step === 1 && <BoardReference onComplete={() => setStep(2)} />}
      {step === 2 && <DashboardGuide onComplete={() => setStep(3)} />}
      {step === 3 && <FlashingSim onComplete={() => setStep(4)} />}
      {step === 4 && <WiFiConnection onComplete={() => setStep(5)} />}
      {step === 5 && <ManusPrompt onComplete={onComplete} />}
    </div>
  );
}

export default Stage4Hardware;
