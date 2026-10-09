import React from 'react';
import toast from 'react-hot-toast';

interface ImageUploadFieldProps {
    label: string;
    value?: string;
    /** Uploads the file and resolves with the public URL. */
    upload: (file: File) => Promise<{ url: string }>;
    onChange: (url: string) => void;
    errorMessage: string;
    /** `round` shows a small circular preview (avatars); default is a tall logo preview. */
    shape?: 'logo' | 'round';
}

/** Labelled image input with preview, used for logos and avatars. */
export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label, value, upload, onChange, errorMessage, shape = 'logo' }) => {
    const id = React.useId();

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await upload(file);
            onChange(result.url);
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(errorMessage);
        }
    };

    return (
        <div>
            <label className="label" htmlFor={id}>{label}</label>
            <div className="flex items-center gap-4">
                {value && (
                    <img
                        src={value}
                        alt={label}
                        className={shape === 'round'
                            ? 'h-16 w-16 rounded-full border border-slate-200 dark:border-slate-700 object-cover'
                            : 'h-24 w-auto border border-slate-200 dark:border-slate-700 rounded-control p-1'}
                    />
                )}
                <input
                    id={id}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="block flex-1 min-w-0 w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400"
                />
            </div>
        </div>
    );
};
