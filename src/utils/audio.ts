import { generateId } from '../db';
import type { AudioAttachment } from '../types';

/**
 * 开始录音，返回停止录音的函数和媒体流
 */
export async function startRecording(): Promise<{
  stop: () => Promise<AudioAttachment>;
  mediaRecorder: MediaRecorder;
}> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // 检测支持的 MIME 类型
  const mimeType = getSupportedMimeType();
  const mediaRecorder = new MediaRecorder(stream, { mimeType });

  const chunks: Blob[] = [];
  let startTime = Date.now();

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.start(100); // 每 100ms 收集一次数据

  const stop = (): Promise<AudioAttachment> => {
    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const duration = (Date.now() - startTime) / 1000;
        const blob = new Blob(chunks, { type: mimeType });

        // 释放麦克风
        stream.getTracks().forEach((track) => track.stop());

        const attachment: AudioAttachment = {
          id: generateId(),
          blob,
          name: `录音 ${new Date().toLocaleString('zh-CN')}`,
          duration: Math.round(duration),
          createdAt: Date.now(),
        };

        resolve(attachment);
      };

      mediaRecorder.onerror = (event) => {
        stream.getTracks().forEach((track) => track.stop());
        reject(new Error('录音失败'));
      };

      // 确保在停止前请求最后的数据块
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.requestData();
        // 给一点时间收集最后的数据
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 100);
      } else {
        reject(new Error('录音器不在录制状态'));
      }
    });
  };

  return { stop, mediaRecorder };
}

/**
 * 获取浏览器支持的录音 MIME 类型
 */
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'audio/webm'; // 兜底
}

/**
 * 获取 Blob 的对象 URL
 */
export function getAudioUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * 释放音频 URL
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}
