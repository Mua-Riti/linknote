import React, { useState, useRef, useCallback, useEffect } from 'react';
import { startRecording } from '../utils/audio';
import type { AudioAttachment } from '../types';

interface VoiceRecorderProps {
  audioAttachments: AudioAttachment[];
  onAddAudio: (audio: AudioAttachment) => void;
  onDeleteAudio: (audioId: string) => void;
}

const WAVE_BARS = 7;

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  audioAttachments,
  onAddAudio,
  onDeleteAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingProgress, setPlayingProgress] = useState(0);
  const stopFnRef = useRef<(() => Promise<AudioAttachment>) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    try {
      const { stop } = await startRecording();
      stopFnRef.current = stop;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('麦克风权限被拒绝');
      } else if (err.name === 'NotFoundError') {
        setError('未检测到麦克风');
      } else {
        setError('录音启动失败');
      }
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!stopFnRef.current) return;
    try {
      const audioAttachment = await stopFnRef.current();
      onAddAudio(audioAttachment);
    } catch (err) {
      setError('录音保存失败');
    } finally {
      setIsRecording(false);
      stopFnRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [onAddAudio]);

  const handlePlayPause = useCallback(
    (audio: AudioAttachment) => {
      if (playingId === audio.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        setPlayingProgress(0);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        return;
      }

      // 停止旧的
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);

      const url = URL.createObjectURL(audio.blob);
      const newAudio = new Audio(url);
      newAudio.onended = () => {
        setPlayingId(null);
        setPlayingProgress(0);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      };
      newAudio.onerror = () => {
        setPlayingId(null);
        setPlayingProgress(0);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      };

      progressTimerRef.current = setInterval(() => {
        if (newAudio.duration && !isNaN(newAudio.duration)) {
          setPlayingProgress((newAudio.currentTime / newAudio.duration) * 100);
        }
      }, 100);

      newAudio.play();
      audioRef.current = newAudio;
      setPlayingId(audio.id);
      setPlayingProgress(0);
    },
    [playingId]
  );

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* 录音按钮区域 */}
      <div className="flex items-center gap-3">
        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500
                       text-white rounded-xl hover:from-rose-600 hover:to-pink-600
                       active:scale-95 transition-all shadow-lg shadow-rose-200"
          >
            {/* 动态声波动画 */}
            <div className="flex items-center gap-0.5 h-4">
              {Array.from({ length: WAVE_BARS }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-white/90 rounded-full animate-pulse-soft"
                  style={{
                    height: `${8 + Math.sin(i * 0.8) * 6}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-semibold">
              停止 {formatTime(recordingTime)}
            </span>
          </button>
        ) : (
          <button
            onClick={handleStartRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-rose-600
                       border-2 border-rose-200 rounded-xl hover:bg-rose-50
                       hover:border-rose-300 active:scale-95 transition-all"
          >
            <span className="text-lg">🎤</span>
            <span className="text-sm font-semibold">开始录音</span>
          </button>
        )}

        {error && (
          <span className="text-[11px] text-red-500 bg-red-50 px-2 py-1 rounded-lg">{error}</span>
        )}
      </div>

      {/* 录音列表 */}
      {audioAttachments.length > 0 && (
        <div className="space-y-2">
          {audioAttachments.map((audio) => {
            const isPlaying = playingId === audio.id;
            return (
              <div
                key={audio.id}
                className={`flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200
                            ${isPlaying
                              ? 'bg-rose-100 border border-rose-200 shadow-sm'
                              : 'bg-white border border-gray-100 hover:border-rose-200'
                            }`}
              >
                {/* 播放按钮 */}
                <button
                  onClick={() => handlePlayPause(audio)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full
                              transition-all active:scale-90 shrink-0 ${
                                isPlaying
                                  ? 'bg-rose-500 text-white shadow-md'
                                  : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                              }`}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* 进度条 + 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-700 truncate">{audio.name}</p>
                    <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                      {formatTime(audio.duration)}
                    </span>
                  </div>
                  {/* 进度条 */}
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-400 rounded-full
                                 transition-all duration-100"
                      style={{ width: `${isPlaying ? playingProgress : 0}%` }}
                    />
                  </div>
                </div>

                {/* 删除 */}
                <button
                  onClick={() => onDeleteAudio(audio.id)}
                  className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50
                             rounded-lg transition-all shrink-0"
                  title="删除录音"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
