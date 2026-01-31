import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, UserPlus, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddCoachFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        id: string;
        profile_id?: string;
        full_name: string;
        email?: string;
        role?: string;
        specialty: string;
        pt_rate: number;
        salary?: number;
        avatar_url?: string;
        image_pos_x?: number;
        image_pos_y?: number;
    } | null;
}

export default function AddCoachForm({ onClose, onSuccess, initialData }: AddCoachFormProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        email: initialData?.email || '',
        password: '',
        role: initialData?.role || 'coach',
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
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
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

            setFormData((prev: any) => ({ ...prev, avatar_url: data.publicUrl }));
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
            let profileId = initialData?.profile_id || null;

            // Handle Account Creation/Update via Edge Function
            // Run function if:
            // 1. It's a new coach
            // 2. Email is changing
            // 3. Password is being set
            const isNewCoach = !initialData;
            const isEmailChanging = formData.email !== initialData?.email;
            const isPasswordChanging = !!formData.password;

            if (isNewCoach || isEmailChanging || isPasswordChanging) {
                const { data: functionData, error: functionError } = await supabase.functions.invoke('staff-management', {
                    body: {
                        userId: profileId,
                        email: formData.email,
                        password: formData.password || (isNewCoach ? Math.random().toString(36).slice(-8) : undefined),
                        fullName: formData.full_name,
                        role: formData.role
                    }
                });

                if (functionError) throw functionError;
                if (functionData?.user_id) profileId = functionData.user_id;
            }

            const coachData: any = {
                full_name: formData.full_name,
                email: formData.email,
                specialty: formData.specialty,
                pt_rate: parseFloat(formData.pt_rate) || 0,
                salary: parseFloat(formData.salary) || 0,
                avatar_url: formData.avatar_url,
                image_pos_x: formData.image_pos_x,
                image_pos_y: formData.image_pos_y
            };

            if (profileId) {
                coachData.profile_id = profileId;
            }

            let error;

            if (initialData) {
                // Update existing coach record in DB
                const { error: updateError } = await supabase
                    .from('coaches')
                    .update(coachData)
                    .eq('id', initialData.id);
                error = updateError;

                // Sync profile data manually as well for extra robustness
                if (profileId) {
                    await supabase
                        .from('profiles')
                        .update({
                            full_name: formData.full_name,
                            role: formData.role,
                            avatar_url: formData.avatar_url
                        })
                        .eq('id', profileId);
                }
            } else {
                // Create new coach record in DB
                const { error: insertError } = await supabase
                    .from('coaches')
                    .insert([coachData]);
                error = insertError;
            }

            if (error) throw error;
            toast.success(initialData ? t('common.saveSuccess') : 'Coach added successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving coach:', error);
            toast.error(error.message || 'Error saving coach');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
            <div
                className="glass-card rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300"
            >
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-xl text-primary">
                                <UserPlus className="w-6 h-6" />
                            </div>
                            {initialData ? 'Edit Coach' : 'Add New Coach'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Full Name</label>
                            <input
                                required
                                type="text"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-white/20"
                                value={formData.full_name}
                                onChange={(e) => {
                                    const newName = e.target.value;
                                    const emailName = newName.toLowerCase().replace(/\s+/g, '');
                                    setFormData(prev => ({
                                        ...prev,
                                        full_name: newName,
                                        email: prev.email === '' || prev.email.includes(`${prev.full_name.toLowerCase().replace(/\s+/g, '')}@epic.com`)
                                            ? (emailName ? `${emailName}@epic.com` : '')
                                            : prev.email
                                    }));
                                }}
                                placeholder="Anis..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Profile Image</label>

                            {/* Preview Area */}
                            <div className="flex gap-4 items-center">
                                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0 bg-white/5 group/img shadow-inner">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                    {formData.avatar_url ? (
                                        <img
                                            src={formData.avatar_url}
                                            className="w-full h-full object-cover relative z-10"
                                            style={{ objectPosition: `${formData.image_pos_x}% ${formData.image_pos_y}%` }}
                                            alt="Preview"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/20 font-black">?</div>
                                    )}
                                </div>

                                <label className="flex-1">
                                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white cursor-pointer transition-all text-center">
                                        {uploading ? 'Uploading...' : 'Browse Image'}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            {/* Position Controls */}
                            {formData.avatar_url && (
                                <div className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 mt-3 shadow-inner">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/30">Horizontal (X)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.image_pos_x}
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, image_pos_x: parseInt(e.target.value) }))}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/30">Vertical (Y)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.image_pos_y}
                                            onChange={(e) => setFormData((prev: any) => ({ ...prev, image_pos_y: parseInt(e.target.value) }))}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Specialty</label>
                        <div className="relative group/specialty">
                            <select
                                required
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white appearance-none cursor-pointer pr-12"
                                value={formData.specialty}
                                onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                            >
                                <option value="" disabled className="bg-slate-900">Select Specialty</option>
                                <option value="Artistic Gymnastics (Boys)" className="bg-slate-900">Artistic Gymnastics (Boys)</option>
                                <option value="Artistic Gymnastics (Girls)" className="bg-slate-900">Artistic Gymnastics (Girls)</option>
                                <option value="Artistic Gymnastics (Mixed)" className="bg-slate-900">Artistic Gymnastics (Boys & Girls)</option>
                                <option value="Rhythmic Gymnastics" className="bg-slate-900">Rhythmic Gymnastics</option>
                            </select>
                            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none opacity-40 group-hover/specialty:opacity-100 transition-opacity">
                                <ChevronDown className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Account Email</label>
                            <input
                                required
                                type="email"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-white/20"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="coach@epicgym.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                                {initialData ? 'Update Password (Optional)' : 'Default Password'}
                            </label>
                            <input
                                required={!initialData}
                                type="password"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-white/20"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">System Access Role</label>
                        <div className="relative group/role">
                            <select
                                required
                                className="w-full px-5 py-3 bg-[#1e2330] border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white font-black uppercase tracking-[0.2em] text-center appearance-none cursor-pointer"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="coach" className="bg-[#1e2330]">{t('roles.coach')}</option>
                                <option value="head_coach" className="bg-[#1e2330]">{t('roles.head_coach')}</option>
                                <option value="admin" className="bg-[#1e2330]">{t('roles.admin')}</option>
                                <option value="reception" className="bg-[#1e2330]">{t('roles.reception')}</option>
                            </select>
                            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none opacity-40 group-hover/role:opacity-100 transition-opacity">
                                <ChevronDown className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">PT Rate (per session)</label>
                            <input
                                required
                                type="number"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                                value={formData.pt_rate}
                                onChange={e => setFormData({ ...formData, pt_rate: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Monthly Salary</label>
                            <input
                                required
                                type="number"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                                value={formData.salary}
                                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-8 border-t border-white/5 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-2xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-10 py-4 bg-gradient-to-r from-primary to-primary/80 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            {loading ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10">{initialData ? 'Update Coach' : 'Save Coach'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

