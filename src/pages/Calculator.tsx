import { useState } from 'react';
import { Calculator as CalculatorIcon, Scale, Activity, Trash2, Delete } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Calculator() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'standard' | 'bmi' | 'calories'>('standard');

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>Gym Tools</h1>
                <p className="opacity-70 mt-1">Professional calculators for your daily needs.</p>
            </div>

            {/* Premium segmented control */}
            <div
                className="flex p-1.5 rounded-2xl w-full sm:w-fit relative backdrop-blur-md border border-white/5 shadow-inner overflow-x-auto no-scrollbar scroll-smooth"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
            >
                {['standard', 'bmi', 'calories'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`
                            relative px-4 sm:px-6 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 z-10
                            flex items-center gap-2 whitespace-nowrap flex-1 sm:flex-none justify-center
                        `}
                        style={{
                            backgroundColor: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === tab ? '#ffffff' : 'rgba(255,255,255,0.7)',
                            boxShadow: activeTab === tab ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                            textShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        {tab === 'standard' && <CalculatorIcon className="w-4 h-4" />}
                        {tab === 'bmi' && <Scale className="w-4 h-4" />}
                        {tab === 'calories' && <Activity className="w-4 h-4" />}
                        <span className="capitalize">{tab}</span>
                    </button>
                ))}
            </div>

            {/* Main Content Area - Glass Card */}
            <div
                className="rounded-3xl p-8 shadow-2xl border border-white/5 relative overflow-hidden transition-all duration-300"
                style={{ backgroundColor: 'var(--color-surface)' }}
            >
                {/* Decorative background element */}
                <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                ></div>

                <div className="relative z-10 min-h-[400px]">
                    {activeTab === 'standard' && <StandardCalculator />}
                    {activeTab === 'bmi' && <BMICalculator />}
                    {activeTab === 'calories' && <CalorieCalculator />}
                </div>
            </div>
        </div>
    );
}

function StandardCalculator() {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');

    const handleNumber = (num: string) => {
        setDisplay(prev => prev === '0' ? num : prev + num);
        setEquation(prev => prev + num);
    };

    const handleOperator = (op: string) => {
        setDisplay('0');
        setEquation(prev => prev + ' ' + op + ' ');
    };

    const calculate = () => {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(equation.replace('x', '*'));
            setDisplay(String(result));
            setEquation(String(result));
        } catch (e) {
            setDisplay('Error');
            setEquation('');
        }
    };

    const clear = () => {
        setDisplay('0');
        setEquation('');
    };

    // Button styles helper
    const btnBase = "h-16 rounded-2xl font-bold text-xl transition-all duration-200 active:scale-95 flex items-center justify-center shadow-lg border border-white/5";

    return (
        <div className="max-w-[320px] mx-auto">
            {/* Screen */}
            <div className="mb-6 p-6 rounded-2xl bg-black/80 shadow-inner border border-white/10 text-right">
                <div className="text-sm text-gray-400 font-mono min-h-[20px] mb-1 opacity-70">{equation}</div>
                <div className="text-4xl font-mono text-white tracking-wider overflow-hidden">{display}</div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-3">
                <button
                    onClick={clear}
                    className={`${btnBase} col-span-3 text-white`}
                    style={{ backgroundColor: '#ef4444' }} // Red for Clear
                >
                    AC
                </button>
                <button
                    onClick={() => handleOperator('/')}
                    className={`${btnBase} text-white`}
                    style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                    ÷
                </button>

                {['7', '8', '9'].map(n => (
                    <button
                        key={n}
                        onClick={() => handleNumber(n)}
                        className={`${btnBase}`}
                        style={{
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            color: 'inherit'
                            // Inherit color allows it to work in both dark/light modes on the 'surface' background
                        }}
                    >
                        {n}
                    </button>
                ))}
                <button
                    onClick={() => handleOperator('*')}
                    className={`${btnBase} text-white`}
                    style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                    ×
                </button>

                {['4', '5', '6'].map(n => (
                    <button
                        key={n}
                        onClick={() => handleNumber(n)}
                        className={`${btnBase}`}
                        style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'inherit' }}
                    >
                        {n}
                    </button>
                ))}
                <button
                    onClick={() => handleOperator('-')}
                    className={`${btnBase} text-white`}
                    style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                    -
                </button>

                {['1', '2', '3'].map(n => (
                    <button
                        key={n}
                        onClick={() => handleNumber(n)}
                        className={`${btnBase}`}
                        style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'inherit' }}
                    >
                        {n}
                    </button>
                ))}
                <button
                    onClick={() => handleOperator('+')}
                    className={`${btnBase} text-white`}
                    style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                    +
                </button>

                <button
                    onClick={() => handleNumber('0')}
                    className={`${btnBase} col-span-2`}
                    style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'inherit' }}
                >
                    0
                </button>
                <button
                    onClick={() => handleNumber('.')}
                    className={`${btnBase}`}
                    style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'inherit' }}
                >
                    .
                </button>
                <button
                    onClick={calculate}
                    className={`${btnBase} text-white`}
                    style={{ backgroundColor: 'var(--color-primary)' }}
                >
                    =
                </button>
            </div>
        </div>
    );
}

function BMICalculator() {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [bmi, setBmi] = useState<number | null>(null);

    const calculateBMI = () => {
        const h = parseFloat(height) / 100;
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            setBmi(Math.round((w / (h * h)) * 10) / 10);
        }
    };

    const getCategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' };
        if (bmi < 25) return { label: 'Normal weight', color: '#10b981' };
        if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
        return { label: 'Obese', color: '#ef4444' };
    };

    const inputStyle = {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
        color: 'inherit'
    };

    return (
        <div className="max-w-md mx-auto space-y-8">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium opacity-70 uppercase tracking-widest pl-1">Weight (kg)</label>
                    <input
                        type="number"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        className="w-full text-center text-3xl font-bold p-6 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all border"
                        style={inputStyle}
                        placeholder="0"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium opacity-70 uppercase tracking-widest pl-1">Height (cm)</label>
                    <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(e.target.value)}
                        className="w-full text-center text-3xl font-bold p-6 rounded-2xl outline-none focus:ring-2 focus:ring-primary/50 transition-all border"
                        style={inputStyle}
                        placeholder="0"
                    />
                </div>
            </div>

            <button
                onClick={calculateBMI}
                className="w-full py-4 rounded-xl font-bold text-lg shadow-lg text-white transition-transform active:scale-95 hover:shadow-xl hover:brightness-110"
                style={{ backgroundColor: 'var(--color-primary)' }}
            >
                Calculate BMI
            </button>

            {bmi && (
                <div className="p-8 rounded-3xl text-center space-y-2 animate-in slide-in-from-bottom-5 border border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <div className="text-sm opacity-60 uppercase tracking-widest">Your Result</div>
                    <div className="text-6xl font-black py-2" style={{ color: 'var(--color-primary)' }}>{bmi}</div>
                    <div className="text-xl font-bold px-4 py-1 rounded-full inline-block" style={{ color: getCategory(bmi).color, backgroundColor: `${getCategory(bmi).color}20` }}>
                        {getCategory(bmi).label}
                    </div>
                </div>
            )}
        </div>
    );
}

function CalorieCalculator() {
    const [data, setData] = useState({
        gender: 'male',
        age: '',
        weight: '',
        height: '',
        activity: '1.2'
    });
    const [result, setResult] = useState<number | null>(null);

    const calculateCalories = () => {
        const w = parseFloat(data.weight);
        const h = parseFloat(data.height);
        const a = parseFloat(data.age);

        if (!w || !h || !a) return;

        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += data.gender === 'male' ? 5 : -161;

        setResult(Math.round(bmr * parseFloat(data.activity)));
    };

    const inputStyle = {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
        color: 'inherit'
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-2 p-1.5 rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    {['male', 'female'].map(g => (
                        <button
                            key={g}
                            onClick={() => setData({ ...data, gender: g })}
                            className={`py-3 rounded-lg font-bold capitalize transition-all ${data.gender === g ? 'shadow-md scale-[1.02]' : 'opacity-50 hover:opacity-80'}`}
                            style={{
                                backgroundColor: data.gender === g ? 'var(--color-background)' : 'transparent',
                                color: data.gender === g ? 'var(--color-primary)' : 'inherit'
                            }}
                        >
                            {g}
                        </button>
                    ))}
                </div>

                {['Age', 'Weight (kg)', 'Height (cm)'].map((label, i) => {
                    const field = label.toLowerCase().split(' ')[0] as keyof typeof data;
                    return (
                        <div key={label} className="space-y-1">
                            <label className="text-xs font-bold opacity-60 uppercase tracking-wider pl-1">{label}</label>
                            <input
                                type="number"
                                value={data[field]}
                                onChange={e => setData({ ...data, [field]: e.target.value })}
                                className="w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all border"
                                style={inputStyle}
                            />
                        </div>
                    );
                })}

                <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 uppercase tracking-wider pl-1">Activity</label>
                    <select
                        value={data.activity}
                        onChange={e => setData({ ...data, activity: e.target.value })}
                        className="w-full p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all border appearance-none"
                        style={inputStyle}
                    >
                        <option style={{ color: '#000' }} value="1.2">Sedentary (Office job)</option>
                        <option style={{ color: '#000' }} value="1.375">Light Exercise (1-2 days)</option>
                        <option style={{ color: '#000' }} value="1.55">Moderate Exercise (3-5 days)</option>
                        <option style={{ color: '#000' }} value="1.725">Heavy Exercise (6-7 days)</option>
                        <option style={{ color: '#000' }} value="1.9">Athlete (2x per day)</option>
                    </select>
                </div>
            </div>

            <button
                onClick={calculateCalories}
                className="w-full py-4 rounded-xl font-bold text-lg shadow-lg text-white transition-transform active:scale-95 hover:shadow-xl hover:brightness-110"
                style={{ backgroundColor: 'var(--color-primary)' }}
            >
                Calculate Daily Calories
            </button>

            {result && (
                <div className="p-8 rounded-3xl text-center space-y-2 animate-in slide-in-from-bottom-5 border border-white/10" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                    <div className="text-sm opacity-60 uppercase tracking-widest">Maintenance Calories</div>
                    <div className="text-5xl font-black py-2" style={{ color: 'var(--color-primary)' }}>{result} <span className="text-xl opacity-50 font-medium">kcal</span></div>
                    <div className="text-xs opacity-50">Calories/day to maintain weight</div>
                </div>
            )}
        </div>
    );
}
