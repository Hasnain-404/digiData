import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const IMGBB_API_KEY = '91f1fed9d7dc996a90e550b0d278db9c';
const IMGBB_URL = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

const ImageUploader = ({ value, onChange }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    // Check file size (max 32MB as per ImgBB)
    if (file.size > 32 * 1024 * 1024) {
      toast.error('Image is too large (max 32MB)');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(IMGBB_URL, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const directUrl = json.data.url || json.data.display_url;
        onChange(directUrl);
        toast.success('Image uploaded permanently (No expiry)! 📸');
      } else {
        toast.error(json.error?.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('ImgBB upload error:', err);
      toast.error('Network error uploading image to ImgBB');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Trade Chart Image
        </label>
        {/* Toggle Mode */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-upload-cloud-2-line" />
            From Device
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
              activeTab === 'url'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="ri-link" />
            Paste URL
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-600'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-blue-400 font-medium">
                  Uploading image to ImgBB (Permanent lifetime link)...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <i className="ri-image-add-line text-2xl text-blue-400" />
                <p className="text-xs text-slate-300 font-medium">
                  Click to select or drag & drop image here
                </p>
                <p className="text-[11px] text-slate-500">
                  PNG, JPG, WEBP &bull; Lifetime permanent link via ImgBB (Never expires)
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="url"
            placeholder="https://i.ibb.co/... or https://i.imgur.com/..."
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 text-sm placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
          />
        </div>
      )}

      {/* Preview Section */}
      {value && (
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 truncate max-w-[280px]">
              <i className="ri-checkbox-circle-fill text-emerald-400" />
              <span className="truncate">{value}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-400 hover:text-blue-400 underline flex items-center gap-0.5"
                title="Open image in new tab"
              >
                <i className="ri-external-link-line" /> Open
              </a>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-[11px] text-rose-400 hover:text-rose-300 p-0.5 rounded hover:bg-rose-500/10 transition-colors"
                title="Remove image"
              >
                <i className="ri-delete-bin-line" /> Remove
              </button>
            </div>
          </div>
          <div className="h-28 w-full rounded-lg overflow-hidden border border-slate-800 bg-black/40 relative group">
            <img
              src={value}
              alt="Trade chart preview"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `<div class="h-full flex items-center justify-center text-xs text-slate-500">Image loaded & permanent link ready</div>`;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
