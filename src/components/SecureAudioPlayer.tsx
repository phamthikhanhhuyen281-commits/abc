import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { Download, Loader2 } from 'lucide-react';

interface SecureAudioPlayerProps extends React.AudioHTMLAttributes<HTMLAudioElement> {
  src: string;
}

export const SecureAudioPlayer: React.FC<SecureAudioPlayerProps> = ({ src, ...props }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setResolvedSrc('');
      setError(false);
      return;
    }

    if (src.startsWith('db_audio:')) {
      setLoading(true);
      setError(false);
      storageService.getAudioData(src)
        .then(data => {
          setResolvedSrc(data);
        })
        .catch(err => {
          console.error('Failed to load DB audio:', err);
          setError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setResolvedSrc(src);
      setError(false);
    }
  }, [src]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 py-1.5 px-3 rounded-lg w-full">
        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
        <span className="font-medium font-sans">Đang tải tệp ghi âm từ Cloud...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[11px] text-red-500 bg-red-50 border border-red-100 py-1.5 px-3 rounded-lg font-medium font-sans w-full">
        Lỗi: Không tải được file ghi âm từ database
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 py-1.5 px-3 rounded-lg italic font-sans w-full">
        Trống
      </div>
    );
  }

  return <audio src={resolvedSrc} {...props} />;
};

interface SecureAudioDownloadButtonProps {
  src: string;
  fileName: string;
}

export const SecureAudioDownloadButton: React.FC<SecureAudioDownloadButtonProps> = ({ src, fileName }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!src) return;

    try {
      setDownloading(true);
      const resolvedSrc = await storageService.getAudioData(src);
      
      // Create a temporary link to download
      const link = document.createElement('a');
      link.href = resolvedSrc;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download audio:', err);
      alert('Không thể tải tệp ghi âm này.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-900 hover:underline bg-white border border-slate-200 px-2 py-1 rounded cursor-pointer disabled:opacity-55 font-sans"
    >
      {downloading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Download className="w-3 h-3" />
      )}
      <span>{downloading ? 'Đang chuẩn bị...' : 'Tải file ghi âm'}</span>
    </button>
  );
};
