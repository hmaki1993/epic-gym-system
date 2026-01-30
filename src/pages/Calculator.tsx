import { useState } from 'react';
import { Calculator as CalculatorIcon, Scale, Activity, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Calculator() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'standard' | 'bmi' | 'calories'>('standard');

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>Gym Tools</h1>
                <p className="opacity-70 mt-1">Calculators for fitness and daily needs</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-black/5 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('standard')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'standard' ? 'bg-primary text-white shadow-md' : 'hover:bg-black/5 opacity-70'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <CalculatorIcon className="w-4 h-4" />
                        Standard
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('bmi')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'bmi' ? 'bg-primary text-white shadow-md' : 'hover:bg-black/5 opacity-70'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        BMI
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('calories')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'calories' ? 'bg-primary text-white shadow-md' : 'hover:bg-black/5 opacity-70'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Calories
                    </div>
                </button>
            </div>

            {/* Content Area */}
            <div
                className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 min-h-[400px]"
                style={{ backgroundColor: 'var(--color-surface)' }}
            >
                {activeTab === 'standard' && <StandardCalculator />}
                {activeTab === 'bmi' && <BMICalculator />}
                {activeTab === 'calories' && <CalorieCalculator />}
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

    return (
        <div className="max-w-xs mx-auto">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl mb-4 text-right">
                <div className="text-sm text-gray-500 min-h-[20px]">{equation}</div>
                <div className="text-3xl font-bold font-mono text-gray-900 dark:text-white truncate">{display}</div>
            </div>
            <div className="grid grid-cols-4 gap-3">
                <button onClick={clear} className="col-span-3 bg-red-100 text-red-600 p-4 rounded-xl font-bold hover:bg-red-200">AC</button>
                <button onClick={() => handleOperator('/')} className="bg-primary/10 text-primary p-4 rounded-xl font-bold hover:bg-primary/20">÷</button>

                {['7', '8', '9'].map(n => (
                    <button key={n} onClick={() => handleNumber(n)} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl font-bold hover:bg-gray-100">{n}</button>
                ))}
                <button onClick={() => handleOperator('*')} className="bg-primary/10 text-primary p-4 rounded-xl font-bold hover:bg-primary/20">x</button>

                {['4', '5', '6'].map(n => (
                    <button key={n} onClick={() => handleNumber(n)} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl font-bold hover:bg-gray-100">{n}</button>
                ))}
                <button onClick={() => handleOperator('-')} className="bg-primary/10 text-primary p-4 rounded-xl font-bold hover:bg-primary/20">-</button>

                {['1', '2', '3'].map(n => (
                    <button key={n} onClick={() => handleNumber(n)} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl font-bold hover:bg-gray-100">{n}</button>
                ))}
                <button onClick={() => handleOperator('+')} className="bg-primary/10 text-primary p-4 rounded-xl font-bold hover:bg-primary/20">+</button>

                <button onClick={() => handleNumber('0')} className="col-span-2 bg-gray-50 dark:bg-white/5 p-4 rounded-xl font-bold hover:bg-gray-100">0</button>
                <button onClick={() => handleNumber('.')} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl font-bold hover:bg-gray-100">.</button>
                <button onClick={calculate} className="bg-primary text-white p-4 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/30">=</button>
            </div>
        </div>
    );
}

function BMICalculator() {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [bmi, setBmi] = useState<number | null>(null);

    const calculateBMI = () => {
        const h = parseFloat(height) / 100; // cm to m
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            setBmi(Math.round((w / (h * h)) * 10) / 10);
        }
    };

    const getCategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500' };
        if (bmi < 25) return { label: 'Normal weight', color: 'text-green-500' };
        if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500' };
        return { label: 'Obese', color: 'text-red-500' };
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium opacity-80">Weight (kg)</label>
                    <input
                        type="number"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        className="w-full text-center text-2xl font-bold p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent focus:border-primary focus:ring-0 outline-none"
                        placeholder="0"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium opacity-80">Height (cm)</label>
                    <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(e.target.value)}
                        className="w-full text-center text-2xl font-bold p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent focus:border-primary focus:ring-0 outline-none"
                        placeholder="0"
                    />
                </div>
            </div>

            <button
                onClick={calculateBMI}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 transition-transform active:scale-95"
            >
                Calculate BMI
            </button>

            {bmi && (
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl text-center space-y-2 animate-in slide-in-from-bottom-5">
                    <div className="text-sm opacity-60">Your BMI is</div>
                    <div className="text-5xl font-black text-primary">{bmi}</div>
                    <div className={`text-xl font-medium ${getCategory(bmi).color}`}>
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

        // Mifflin-St Jeor Equation
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += data.gender === 'male' ? 5 : -161;

        setResult(Math.round(bmr * parseFloat(data.activity)));
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setData({ ...data, gender: 'male' })}
                        className={`py-2 rounded-md font-medium transition-colors ${data.gender === 'male' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'opacity-60'}`}
                    >
                        Male
                    </button>
                    <button
                        onClick={() => setData({ ...data, gender: 'female' })}
                        className={`py-2 rounded-md font-medium transition-colors ${data.gender === 'female' ? 'bg-white dark:bg-gray-700 text-pink-500 shadow-sm' : 'opacity-60'}`}
                    >
                        Female
                    </button>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium opacity-70">Age</label>
                    <input type="number" value={data.age} onChange={e => setData({ ...data, age: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium opacity-70">Weight (kg)</label>
                    <input type="number" value={data.weight} onChange={e => setData({ ...data, weight: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium opacity-70">Height (cm)</label>
                    <input type="number" value={data.height} onChange={e => setData({ ...data, height: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium opacity-70">Activity</label>
                    <select
                        value={data.activity}
                        onChange={e => setData({ ...data, activity: e.target.value })}
                        className="w-full p-3 bg-gray-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="1.2">Sedentary</option>
                        <option value="1.375">Light Exercise</option>
                        <option value="1.55">Moderate Exercise</option>
                        <option value="1.725">Heavy Exercise</option>
                        <option value="1.9">Athlete</option>
                    </select>
                </div>
            </div>

            <button
                onClick={calculateCalories}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 transition-transform active:scale-95"
            >
                Calculate Daily Calories
            </button>

            {result && (
                <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl text-center space-y-2 animate-in slide-in-from-bottom-5">
                    <div className="text-sm opacity-60">Maintenance Calories</div>
                    <div className="text-5xl font-black text-primary">{result} <span className="text-lg text-gray-400 font-normal">kcal</span></div>
                    <div className="text-xs opacity-50">To maintain current weight</div>
                </div>
            )}
        </div>
    );
}
