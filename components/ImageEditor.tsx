import React, { useState, useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { editImage, upscaleImage } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { UploadIcon, DownloadIcon, UpscaleIcon } from './icons';
import { fileToBase64 } from '../utils/fileUtils';

// Helper to get base64 from a cropped image canvas
async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<{ base64: string; mimeType: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height,
  );
  
  return new Promise((resolve, reject) => {
    const base64Image = canvas.toDataURL('image/png');
    const [header, data] = base64Image.split(',');
    if (!header || !data) {
        reject(new Error("Could not convert canvas to base64."));
        return;
    }
    const mimeTypeMatch = header.match(/:(.*?);/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
    resolve({ base64: data, mimeType });
  });
}

const ImageEditor: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [originalImage, setOriginalImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [upscaleError, setUpscaleError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalImage({ file, previewUrl: URL.createObjectURL(file) });
      setEditedImage(null);
      setError(null);
      setUpscaledImage(null);
      setUpscaleError(null);
      setCrop(undefined); // Reset crop on new image
      setCompletedCrop(undefined);
    }
  };
  
  const handleClearCrop = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleEdit = useCallback(async () => {
    if (!originalImage) {
      setError('لطفا ابتدا یک تصویر آپلود کنید.');
      return;
    }
    if (!prompt) {
      setError('لطفا دستور ویرایش را وارد کنید.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    setUpscaledImage(null);
    setUpscaleError(null);

    try {
      let imageToEdit: { base64: string; mimeType: string };

      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
        imageToEdit = await getCroppedImg(imgRef.current, completedCrop);
      } else {
        imageToEdit = await fileToBase64(originalImage.file);
      }

      const editedImageBytes = await editImage(imageToEdit.base64, imageToEdit.mimeType, prompt);
      setEditedImage(`data:image/png;base64,${editedImageBytes}`);
    } catch (err: any) {
      setError(err.message || 'خطایی غیرمنتظره رخ داد.');
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt, completedCrop]);

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    const filename = prompt.slice(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `gemini-edited-${filename || 'download'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpscale = async () => {
    if (!editedImage) {
      setUpscaleError("تصویر ویرایش شده‌ای برای افزایش کیفیت وجود ندارد.");
      return;
    }
    setIsUpscaling(true);
    setUpscaleError(null);
    setUpscaledImage(null);
    
    try {
        const [header, data] = editedImage.split(',');
        if (!header || !data) {
            throw new Error("فرمت تصویر ویرایش شده نامعتبر است.");
        }
        const mimeTypeMatch = header.match(/:(.*?);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
        
        const upscaledImageBytes = await upscaleImage(data, mimeType);
        setUpscaledImage(`data:image/png;base64,${upscaledImageBytes}`);
    } catch (err: any) {
        setUpscaleError(err.message || 'خطایی غیرمنتظره در هنگام افزایش کیفیت رخ داد.');
    } finally {
        setIsUpscaling(false);
    }
  };

  const handleDownloadUpscaled = () => {
    if (!upscaledImage) return;
    const link = document.createElement('a');
    link.href = upscaledImage;
    const filename = prompt.slice(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `gemini-upscaled-${filename || 'download'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-center text-slate-800">ویرایش تصویر با دستور متنی</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Right Column in LTR, Left in RTL: Edited Image */}
        <div className="flex flex-col gap-4">
          <label className="block text-sm font-medium text-slate-600">
            ۳. تصویر ویرایش شده خود را مشاهده کنید
          </label>
          <div className="relative w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
            {isLoading ? (
               <div className="text-center text-slate-500">
                 <LoadingSpinner large={true} />
                 <p className="mt-2">در حال ویرایش...</p>
               </div>
            ) : editedImage ? (
              <>
                <img src={editedImage} alt="Edited" className="object-contain w-full h-full rounded-lg" />
                <button
                  onClick={handleDownload}
                  className="absolute top-4 left-4 bg-white/60 text-slate-800 p-2 rounded-full backdrop-blur-sm hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-blue-500 transition-all"
                  aria-label="دانلود تصویر ویرایش شده"
                  title="دانلود تصویر ویرایش شده"
                >
                  <DownloadIcon />
                </button>
              </>
            ) : (
              <p className="text-slate-400">تصویر ویرایش شده شما در اینجا نمایش داده می‌شود</p>
            )}
          </div>
          {editedImage && !isLoading && (
            <button
              onClick={handleUpscale}
              disabled={isUpscaling}
              className="w-full flex justify-center items-center gap-2 bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 disabled:bg-slate-400 disabled:text-slate-200 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isUpscaling ? <LoadingSpinner /> : <UpscaleIcon />}
              {isUpscaling ? 'در حال افزایش کیفیت...' : 'افزایش کیفیت تصویر'}
            </button>
          )}
        </div>

        {/* Left Column in LTR, Right in RTL: Upload & Original Image */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
             <label className="block text-sm font-medium text-slate-600">
               ۱. تصویر خود را آپلود و برش دهید
            </label>
            <div className="flex items-center gap-4">
              {completedCrop && completedCrop.width > 0 && (
                <button onClick={handleClearCrop} className="text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer transition-colors">
                  لغو انتخاب
                </button>
              )}
              {originalImage && (
                <label htmlFor="image-upload" className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors">
                  تغییر تصویر
                </label>
              )}
            </div>
          </div>
          <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden">
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            {originalImage ? (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img 
                  ref={imgRef}
                  src={originalImage.previewUrl} 
                  alt="Crop preview" 
                  className="object-contain w-full h-full"
                />
              </ReactCrop>
            ) : (
              <label htmlFor="image-upload" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 transition-colors">
                <div className="text-center text-slate-400">
                  <UploadIcon />
                  <p className="mt-2">برای آپلود کلیک کنید یا فایل را بکشید</p>
                </div>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Prompt and Button */}
      <div>
        <label htmlFor="prompt-edit" className="block text-sm font-medium text-slate-600 mb-2">
          ۲. ویرایش‌های مورد نظر را توصیف کنید
        </label>
        <textarea
          id="prompt-edit"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="مثال: یک فیلتر قدیمی اضافه کن، یا شخص حاضر در پس‌زمینه را حذف کن"
          className="w-full h-24 p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-slate-800"
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleEdit}
        disabled={isLoading || !prompt || !originalImage}
        className="w-full flex justify-center items-center bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:text-blue-100 disabled:cursor-not-allowed transition-all duration-300"
      >
        {isLoading ? <LoadingSpinner /> : 'اعمال ویرایش‌ها'}
      </button>

      {error && <p className="text-red-600 text-center bg-red-100 p-3 rounded-lg">{error}</p>}
      
      {(isUpscaling || upscaledImage || upscaleError) && (
        <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xl font-bold text-center text-slate-800 mb-4">نتیجه افزایش کیفیت</h3>
            <div className="relative w-full aspect-square max-w-md mx-auto bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
                {isUpscaling ? (
                    <div className="text-center text-slate-500">
                        <LoadingSpinner large={true} />
                        <p className="mt-2">در حال بهبود تصویر شما...</p>
                    </div>
                ) : upscaledImage ? (
                    <>
                        <img src={upscaledImage} alt="Upscaled" className="object-contain w-full h-full rounded-lg" />
                        <button
                            onClick={handleDownloadUpscaled}
                            className="absolute top-4 left-4 bg-white/60 text-slate-800 p-2 rounded-full backdrop-blur-sm hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-blue-500 transition-all"
                            aria-label="دانلود تصویر باکیفیت"
                            title="دانلود تصویر باکیفیت"
                        >
                            <DownloadIcon />
                        </button>
                    </>
                ) : (
                    <p className="text-slate-400">تصویر باکیفیت در اینجا نمایش داده می‌شود</p>
                )}
            </div>
            {upscaleError && <p className="text-red-600 text-center bg-red-100 p-3 rounded-lg mt-4 max-w-md mx-auto">{upscaleError}</p>}
        </div>
      )}
    </div>
  );
};

export default ImageEditor;