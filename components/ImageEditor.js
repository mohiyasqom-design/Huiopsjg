import React, { useState, useCallback, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import { editImage, upscaleImage } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { UploadIcon, DownloadIcon, UpscaleIcon } from './icons';
import { fileToBase64 } from '../utils/fileUtils';

// Helper to get base64 from a cropped image canvas
async function getCroppedImg(image, crop) {
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

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
    crop.height
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

const ImageEditor = () => {
  const [prompt, setPrompt] = useState('');
  const [originalImage, setOriginalImage] = useState(null);
  const [editedImage, setEditedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [upscaledImage, setUpscaledImage] = useState(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleError, setUpscaleError] = useState(null);

  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setOriginalImage({ file, previewUrl: URL.createObjectURL(file) });
      setEditedImage(null);
      setError(null);
      setUpscaledImage(null);
      setUpscaleError(null);
      setCrop(undefined);
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
      let imageToEdit;

      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
        imageToEdit = await getCroppedImg(imgRef.current, completedCrop);
      } else {
        imageToEdit = await fileToBase64(originalImage.file);
      }

      const editedImageBytes = await editImage(imageToEdit.base64, imageToEdit.mimeType, prompt);
      setEditedImage(`data:image/png;base64,${editedImageBytes}`);
    } catch (err) {
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
      if (!header || !data) throw new Error("فرمت تصویر ویرایش شده نامعتبر است.");
      const mimeTypeMatch = header.match(/:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

      const upscaledImageBytes = await upscaleImage(data, mimeType);
      setUpscaledImage(`data:image/png;base64,${upscaledImageBytes}`);
    } catch (err) {
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

  return React.createElement(
    'div',
    { className: 'flex flex-col gap-6' },
    React.createElement('h2', { className: 'text-2xl font-bold text-center text-slate-800' }, 'ویرایش تصویر با دستور متنی'),

    // Main grid
    React.createElement(
      'div',
      { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start' },

      // Edited Image Column
      React.createElement(
        'div',
        { className: 'flex flex-col gap-4' },
        React.createElement('label', { className: 'block text-sm font-medium text-slate-600' }, '۳. تصویر ویرایش شده خود را مشاهده کنید'),
        React.createElement(
          'div',
          { className: 'relative w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300' },
          isLoading
            ? React.createElement('div', { className: 'text-center text-slate-500' },
                React.createElement(LoadingSpinner, { large: true }),
                React.createElement('p', { className: 'mt-2' }, 'در حال ویرایش...')
              )
            : editedImage
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement('img', { src: editedImage, alt: 'Edited', className: 'object-contain w-full h-full rounded-lg' }),
                  React.createElement(
                    'button',
                    {
                      onClick: handleDownload,
                      className: 'absolute top-4 left-4 bg-white/60 text-slate-800 p-2 rounded-full backdrop-blur-sm hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-blue-500 transition-all',
                      'aria-label': 'دانلود تصویر ویرایش شده',
                      title: 'دانلود تصویر ویرایش شده'
                    },
                    React.createElement(DownloadIcon, null)
                  )
                )
              : React.createElement('p', { className: 'text-slate-400' }, 'تصویر ویرایش شده شما در اینجا نمایش داده می‌شود')
        ),
        editedImage && !isLoading &&
          React.createElement(
            'button',
            {
              onClick: handleUpscale,
              disabled: isUpscaling,
              className: 'w-full flex justify-center items-center gap-2 bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 disabled:bg-slate-400 disabled:text-slate-200 disabled:cursor-not-allowed transition-all duration-300'
            },
            isUpscaling ? React.createElement(LoadingSpinner, null) : React.createElement(UpscaleIcon, null),
            isUpscaling ? 'در حال افزایش کیفیت...' : 'افزایش کیفیت تصویر'
          )
      ),

      // Upload & Original Image Column
      React.createElement(
        'div',
        { className: 'flex flex-col gap-4' },
        React.createElement(
          'div',
          { className: 'flex justify-between items-center' },
          React.createElement('label', { className: 'block text-sm font-medium text-slate-600' }, '۱. تصویر خود را آپلود و برش دهید'),
          React.createElement(
            'div',
            { className: 'flex items-center gap-4' },
            completedCrop && completedCrop.width > 0 &&
              React.createElement('button', { onClick: handleClearCrop, className: 'text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer transition-colors' }, 'لغو انتخاب'),
            originalImage &&
              React.createElement('label', { htmlFor: 'image-upload', className: 'text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors' }, 'تغییر تصویر')
          )
        ),
        React.createElement(
          'div',
          { className: 'w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden' },
          React.createElement('input', { id: 'image-upload', type: 'file', accept: 'image/*', onChange: handleFileChange, className: 'hidden', disabled: isLoading }),
          originalImage
            ? React.createElement(
                ReactCrop,
                { crop: crop, onChange: (_, percentCrop) => setCrop(percentCrop), onComplete: (c) => setCompletedCrop(c) },
                React.createElement('img', { ref: imgRef, src: originalImage.previewUrl, alt: 'Crop preview', className: 'object-contain w-full h-full' })
              )
            : React.createElement(
                'label',
                { htmlFor: 'image-upload', className: 'absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 transition-colors' },
                React.createElement('div', { className: 'text-center text-slate-400' },
                  React.createElement(UploadIcon, null),
                  React.createElement('p', { className: 'mt-2' }, 'برای آپلود کلیک کنید یا فایل را بکشید')
                )
              )
        )
      )
    ),

    // Prompt
    React.createElement('div', null,
      React.createElement('label', { htmlFor: 'prompt-edit', className: 'block text-sm font-medium text-slate-600 mb-2' }, '۲. ویرایش‌های مورد نظر را توصیف کنید'),
      React.createElement('textarea', {
        id: 'prompt-edit',
        value: prompt,
        onChange: (e) => setPrompt(e.target.value),
        placeholder: 'مثال: یک فیلتر قدیمی اضافه کن، یا شخص حاضر در پس‌زمینه را حذف کن',
        className: 'w-full h-24 p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-slate-800',
        disabled: isLoading
      })
    ),

    // Edit Button
    React.createElement(
      'button',
      {
        onClick: handleEdit,
        disabled: isLoading || !prompt || !originalImage,
        className: 'w-full flex justify-center items-center bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:text-blue-100 disabled:cursor-not-allowed transition-all duration-300'
      },
      isLoading ? React.createElement(LoadingSpinner, null) : 'اعمال ویرایش‌ها'
    ),

    error && React.createElement('p', { className: 'text-red-600 text-center bg-red-100 p-3 rounded-lg' }, error),

    // Upscaled Result Section
    (isUpscaling || upscaledImage || upscaleError) &&
      React.createElement(
        'div',
        { className: 'mt-8 pt-6 border-t border-slate-200' },
        React.createElement('h3', { className: 'text-xl font-bold text-center text-slate-800 mb-4' }, 'نتیجه افزایش کیفیت'),
        React.createElement(
          'div',
          { className: 'relative w-full aspect-square max-w-md mx-auto bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300' },
          isUpscaling
            ? React.createElement('div', { className: 'text-center text-slate-500' },
                React.createElement(LoadingSpinner, { large: true }),
                React.createElement('p', { className: 'mt-2' }, 'در حال بهبود تصویر شما...')
              )
            : upscaledImage
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement('img', { src: upscaledImage, alt: 'Upscaled', className: 'object-contain w-full h-full rounded-lg' }),
                  React.createElement(
                    'button',
                    {
                      onClick: handleDownloadUpscaled,
                      className: 'absolute top-4 left-4 bg-white/60 text-slate-800 p-2 rounded-full backdrop-blur-sm hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-blue-500 transition-all',
                      'aria-label': 'دانلود تصویر باکیفیت',
                      title: 'دانلود تصویر باکیفیت'
                    },
                    React.createElement(DownloadIcon, null)
                  )
                )
              : React.createElement('p', { className: 'text-slate-400' }, 'تصویر باکیفیت در اینجا نمایش داده می‌شود')
        ),
        upscaleError && React.createElement('p', { className: 'text-red-600 text-center bg-red-100 p-3 rounded-lg mt-4 max-w-md mx-auto' }, upscaleError)
      )
  );
};

export default ImageEditor;
