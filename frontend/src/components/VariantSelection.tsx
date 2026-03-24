import { useState } from 'react';
import type { SheetRow } from '../services/sheets';

interface Props {
  row: SheetRow;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string) => Promise<void>;
  onCancel: () => void;
}

export function VariantSelection({ row, onApprove, onCancel }: Props) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [postTime, setPostTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const variants = [row.variant1, row.variant2, row.variant3, row.variant4].filter(Boolean);
  const images = [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4].filter(Boolean);

  const handleSubmit = async () => {
    if (selectedVariantIndex === null) {
      alert('Please select a text variant.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedText = variants[selectedVariantIndex];
      const selectedImageId = selectedImageIndex !== null ? images[selectedImageIndex] : '';
      
      // Convert local datetime-local to format expected by backend (YYYY-MM-DD HH:MM)
      let formattedTime = '';
      if (postTime) {
        const date = new Date(postTime);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      }

      await onApprove(selectedText, selectedImageId, formattedTime);
    } catch (error) {
      console.error(error);
      alert('Failed to approve variant.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Variants</h2>
            <p className="text-sm text-gray-500">Topic: {row.topic}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-4">1. Select Text Variant</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {variants.map((variant, index) => (
                  <div 
                    key={`variant-${index}`}
                    onClick={() => setSelectedVariantIndex(index)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedVariantIndex === index 
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Variant {index + 1}</span>
                      <input 
                        type="radio" 
                        checked={selectedVariantIndex === index} 
                        readOnly 
                        className="text-blue-600"
                      />
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{variant}</p>
                  </div>
                ))}
              </div>
            </section>

            {images.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4">2. Select Image (Optional)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((img, index) => (
                    <div 
                      key={`img-${index}`}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square border rounded-lg cursor-pointer overflow-hidden group ${
                        selectedImageIndex === index 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200'
                      }`}
                    >
                      <img src={img} alt={`Generated option ${index + 1}`} className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 flex items-center justify-center ${selectedImageIndex === index ? 'bg-blue-500/20' : 'bg-black/0 group-hover:bg-black/10'}`}>
                        {selectedImageIndex === index && (
                          <div className="bg-blue-500 text-white rounded-full p-1">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div 
                    onClick={() => setSelectedImageIndex(null)}
                    className={`flex items-center justify-center aspect-square border rounded-lg cursor-pointer ${
                      selectedImageIndex === null 
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' 
                        : 'border-gray-200 border-dashed hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-500">No Image</span>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-lg font-semibold mb-4">3. Schedule (Optional)</h3>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">Post Time</label>
                <input 
                  type="datetime-local" 
                  value={postTime}
                  onChange={(e) => setPostTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to post immediately on next action run</p>
              </div>
            </section>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button 
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting || selectedVariantIndex === null}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? 'Approving...' : 'Approve Post'}
          </button>
        </div>
      </div>
    </div>
  );
}