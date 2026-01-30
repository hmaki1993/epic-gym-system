import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, type = 'danger' }: ConfirmModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--color-surface)', color: 'inherit' }}
            >
                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b ${type === 'danger' ? 'border-red-500/20 bg-red-500/10' : 'border-gray-100/10'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg">{title}</h3>
                    </div>
                    <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="opacity-80 leading-relaxed">{message}</p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-medium opacity-70 hover:opacity-100 hover:bg-black/5 transition-all"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                            }`}
                    >
                        {t('common.confirm', 'Confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
