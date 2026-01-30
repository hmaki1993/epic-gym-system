import { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddCoachFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        id: string;
        full_name: string;
        specialty: string;
        pt_rate: number;
        salary?: number;
        avatar_url?: string;
        image_pos_x?: number;
        image_pos_y?: number;
    } | null;
}

export default function AddCoachForm({ onClose, onSuccess, initialData }: AddCoachFormProps) {
    // const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        specialty: initialData?.specialty || '',
        pt_rate: initialData?.pt_rate?.toString() || '',
        salary: initialData?.salary?.toString() || '',
        avatar_url: initialData?.avatar_url || '',
        image_pos_x: initialData?.image_pos_x ?? 50,
        image_pos_y: initialData?.image_pos_y ?? 50
    });
    const [uploading, setUploading] = useState(false);

    // Common Input Styles to match Settings.tsx theme system
    const inputStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: 'inherit',
        borderColor: 'rgba(128, 128, 128, 0.3)'
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('coaches')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('coaches')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const coachData = {
                full_name: formData.full_name,
                specialty: formData.specialty,
                pt_rate: parseFloat(formData.pt_rate) || 0,
                salary: parseFloat(formData.salary) || 0,
                avatar_url: formData.avatar_url,
                image_pos_x: formData.image_pos_x,
                image_pos_y: formData.image_pos_y
            };

            let error;

            if (initialData) {
                // Update existing coach
                const { error: updateError } = await supabase
                    .from('coaches')
                    .update(coachData)
                    .eq('id', initialData.id);
                error = updateError;
            } else {
                // Create new coach
                const { error: insertError } = await supabase
                    .from('coaches')
                    .insert([coachData]);
                error = insertError;
            }

            if (error) throw error;
            toast.success(initialData ? 'Coach updated successfully' : 'Coach added successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving coach:', error);
            toast.error('Error saving coach');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                style={{ backgroundColor: 'var(--color-surface)', color: 'inherit' }}
            >
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/10" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        {initialData ? 'Edit Coach' : 'Add New Coach'}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">Full Name</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium opacity-80">Profile Image</label>

                            {/* Preview Area */}
                            <div className="flex gap-4 items-center">
                                <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 flex-shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                    {formData.avatar_url ? (
                                        <img
                                            src={formData.avatar_url}
                                            className="w-full h-full object-cover"
                                            style={{ objectPosition: `${formData.image_pos_x}% ${formData.image_pos_y}%` }}
                                            alt="Preview"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-40">?</div>
                                    )}
                                </div>

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="w-full text-sm opacity-70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                                    disabled={uploading}
                                />
                            </div>

                            {/* Position Controls */}
                            {formData.avatar_url && (
                                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-white/5 mt-2" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                                    <div className="space-y-1">
                                        <label className="text-xs opacity-60">Horizontal (X)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.image_pos_x}
                                            onChange={(e) => setFormData(prev => ({ ...prev, image_pos_x: parseInt(e.target.value) }))}
                                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs opacity-60">Vertical (Y)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.image_pos_y}
                                            onChange={(e) => setFormData(prev => ({ ...prev, image_pos_y: parseInt(e.target.value) }))}
                                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            {uploading && <p className="text-xs text-primary animate-pulse">Uploading...</p>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium opacity-80">Specialty</label>
                        <select
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                            value={formData.specialty}
                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                            style={inputStyle}
                        >
                            <option value="" disabled className="text-gray-500">Select Specialty</option>
                            <option value="Artistic Gymnastics (Boys)" className="text-black dark:text-gray-900">Artistic Gymnastics (Boys)</option>
                            <option value="Artistic Gymnastics (Girls)" className="text-black dark:text-gray-900">Artistic Gymnastics (Girls)</option>
                            <option value="Artistic Gymnastics (Mixed)" className="text-black dark:text-gray-900">Artistic Gymnastics (Boys & Girls)</option>
                            <option value="Rhythmic Gymnastics" className="text-black dark:text-gray-900">Rhythmic Gymnastics</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">PT Rate (per session)</label>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.pt_rate}
                                onChange={e => setFormData({ ...formData, pt_rate: e.target.value })}
                                placeholder="0.00"
                                style={inputStyle}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">Monthly Salary</label>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.salary}
                                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                                placeholder="0.00"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 opacity-70 hover:opacity-100 font-medium hover:bg-black/5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white font-medium rounded-lg shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {loading ? 'Saving...' : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {initialData ? 'Update Coach' : 'Save Coach'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

