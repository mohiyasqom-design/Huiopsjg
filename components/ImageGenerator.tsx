import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { DownloadIcon } from './icons';

const aspectRatioOptions: { label: string, value: string }[] = [
  { label: '۱:۱', value: '1:1' },
  { label: '۱۶:۹', value: '16:9' },
  { label: '۹:۱۶', value: '9:16' },
];

const aspectRatioStyles: { [key: string]: string } = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
};

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) {
      setError('لطفاً یک دستور وارد کنید.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageBytes = await generateImage(prompt, aspectRatio);
      setGeneratedImage(`data:image/png;base64,${imageBytes}`);
    } catch (err: any) {
      setError(err.message || 'خطایی غیرمنتظره رخ داد.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    const filename = prompt.slice(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `gemini-image-${filename || 'download'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-center text-slate-800">ایجاد تصویر از طریق دستور متنی</h2>
      <div>
        <label htmlFor="prompt-generate" className="block text-sm font-medium text-slate-600 mb-2">
          دستور خلاقانه شما
        </label>
        <textarea
          id="prompt-generate"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="مثال: یک هولوگرام نئونی از یک گربه در حال رانندگی با یک ماشین اسپرت با سرعت بالا"
          className="w-full h-24 p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-slate-800"
          disabled={isLoading}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">
          نسبت تصویر
        </label>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
          {aspectRatioOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAspectRatio(option.value)}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 focus-visible:ring-blue-500 disabled:opacity-50 ${
                aspectRatio === option.value
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isLoading || !prompt}
        className="w-full flex justify-center items-center bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:text-blue-100 disabled:cursor-not-allowed transition-all duration-300"
      >
        {isLoading ? <LoadingSpinner /> : 'ایجاد کن'}
      </button>

      {error && <p className="text-red-600 text-center bg-red-100 p-3 rounded-lg">{error}</p>}
      
      <div className={`relative w-full ${aspectRatioStyles[aspectRatio]} max-h-[75vh] mx-auto bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 transition-all duration-300`}>
        {isLoading ? (
          <div className="text-center text-slate-500">
            <LoadingSpinner large={true} />
            <p className="mt-2">در حال خلق شاهکار شما...</p>
          </div>
        ) : generatedImage ? (
          <>
            <img src={generatedImage} alt="Generated" className="object-contain w-full h-full rounded-lg" />
            <button
              onClick={handleDownload}
              className="absolute top-4 left-4 bg-white/60 text-slate-800 p-2 rounded-full backdrop-blur-sm hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-blue-500 transition-all"
              aria-label="دانلود تصویر"
              title="دانلود تصویر"
            >
              <DownloadIcon />
            </button>
          </>
        ) : (
          <p className="text-slate-400">تصویر ساخته شده شما در اینجا نمایش داده می‌شود</p>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;