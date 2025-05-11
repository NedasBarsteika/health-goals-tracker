import React, { useState } from 'react';

// Paprasti UI komponentai
interface CardProps { children: React.ReactNode; className?: string; }
export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white shadow-md rounded-2xl p-4 mb-4 ${className}`}>{children}</div>
);

interface CardContentProps { children: React.ReactNode; }
export const CardContent: React.FC<CardContentProps> = ({ children }) => (
  <div className="p-2">{children}</div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}
export const Button: React.FC<ButtonProps> = ({ children, className = '', ...props }) => (
  <button
    className={`px-4 py-2 rounded-2xl shadow hover:opacity-90 focus:outline-none focus:ring ${className}`}
    {...props}
  >
    {children}
  </button>
);

// Duomenų ir statistikų tipai
type ActivityData = {
  date: string;
  calories: number;
  caloriesGoal: number;
  exercise: number;
  exerciseGoal: number;
  stand: number;
  standGoal: number;
};

type Stats = {
  totalDays: number;
  maxCalories: number;
  maxExercise: number;
  maxStand: number;
  avgCalories: number;
  avgExercise: number;
  avgStand: number;
  daysHitCalories: number;
  daysHitExercise: number;
  daysHitStand: number;
};

export default function ActivityAnalyzer() {
  const [xmlText, setXmlText] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);

  const parseXml = (text: string) => {
    const wrapped = `<root>${text}</root>`;
    const parser = new DOMParser();
    const xml = parser.parseFromString(wrapped, 'application/xml');
    const entries = Array.from(xml.getElementsByTagName('ActivitySummary'));
    if (entries.length === 0) {
      alert('Nerasta jokių ActivitySummary elementų.');
      return;
    }
    const data: ActivityData[] = entries.map(e => ({
      date: e.getAttribute('dateComponents') || '',
      calories: parseFloat(e.getAttribute('activeEnergyBurned') || '0'),
      caloriesGoal: parseFloat(e.getAttribute('activeEnergyBurnedGoal') || '0'),
      exercise: parseFloat(e.getAttribute('appleExerciseTime') || '0'),
      exerciseGoal: parseFloat(e.getAttribute('appleExerciseTimeGoal') || '0'),
      stand: parseFloat(e.getAttribute('appleStandHours') || '0'),
      standGoal: parseFloat(e.getAttribute('appleStandHoursGoal') || '0'),
    }));

    const totalDays = data.length;
    const maxCalories = Math.max(...data.map(d => d.calories));
    const maxExercise = Math.max(...data.map(d => d.exercise));
    const maxStand = Math.max(...data.map(d => d.stand));
    const sumCalories = data.reduce((sum, d) => sum + d.calories, 0);
    const sumExercise = data.reduce((sum, d) => sum + d.exercise, 0);
    const sumStand = data.reduce((sum, d) => sum + d.stand, 0);
    const avgCalories = sumCalories / totalDays;
    const avgExercise = sumExercise / totalDays;
    const avgStand = sumStand / totalDays;
    const daysHitCalories = data.filter(d => d.calories >= d.caloriesGoal).length;
    const daysHitExercise = data.filter(d => d.exercise >= d.exerciseGoal).length;
    const daysHitStand = data.filter(d => d.stand >= d.standGoal).length;

    setStats({ totalDays, maxCalories, maxExercise, maxStand, avgCalories, avgExercise, avgStand, daysHitCalories, daysHitExercise, daysHitStand });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      setXmlText(text);
    }
  };

  // Palyginimo procentai ir rekomendacijos
  const renderRecommendation = (hit: number, total: number, label: string) => {
    const rate = hit / total;
    if (rate >= 0.8) {
      return <p>🔔 Rekomendacija: pabandykite <strong>padidinti</strong> {label} tikslą (pasiekiate {Math.round(rate * 100)}% dienų).</p>;
    }
    if (rate <= 0.3) {
      return <p>🔔 Rekomendacija: apsvarstykite <strong>sumenkinti</strong> {label} tikslą (pasiekiate tik {Math.round(rate * 100)}% dienų).</p>;
    }
    return null;
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card>
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Įkelkite savo XML duomenis</h2>
          <input type="file" accept=".xml" onChange={handleFileUpload} className="mb-2" />
          <textarea
            rows={10}
            value={xmlText}
            onChange={e => setXmlText(e.target.value)}
            placeholder="Čia įklijuokite XML tekstą"
            className="w-full p-2 border rounded"
          />
          <Button className="mt-2 bg-blue-500 text-white" onClick={() => parseXml(xmlText)}>Analizuoti</Button>
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardContent>
            <h2 className="text-xl font-bold mb-2">Rezultatai ({stats.totalDays} dienos)</h2>
            {/* Didžiausi rodikliai */}
            <div className="mb-4">
              <ul className="list-disc list-inside">
                <li>🔥 Daugiausiai sudegintų kalorijų per dieną: {stats.maxCalories.toFixed(2)}</li>
                <li>🏃‍♂️ Daugiausiai exercise minučių per dieną: {stats.maxExercise.toFixed(0)}</li>
                <li>🚶‍♂️ Daugiausiai standing valandų per dieną: {stats.maxStand.toFixed(0)}</li>
              </ul>
            </div>

            {/* Vidutiniai rodikliai */}
            <div className="mb-4">
              <ul className="list-disc list-inside">
                <li>🔥 Vidutiniškai sudeginama kalorijų per dieną: {stats.avgCalories.toFixed(2)}</li>
                <li>🏃‍♂️ Vidutiniškai exercise minučių per dieną: {stats.avgExercise.toFixed(2)}</li>
                <li>🚶‍♂️ Vidutiniškai standing valandų per dieną: {stats.avgStand.toFixed(2)}</li>
              </ul>
            </div>

            {/* Tikslų pasiekimas */}
            <div className="mb-2">
              <ul className="list-disc list-inside">
                <li>🔥 Dienų, kai pasiekė kalorijų tikslą: {stats.daysHitCalories}/{stats.totalDays}</li>
                <li>🏃‍♂️ Dienų, kai pasiekė exercise tikslą: {stats.daysHitExercise}/{stats.totalDays}</li>
                <li>🚶‍♂️ Dienų, kai pasiekė standing hours tikslą: {stats.daysHitStand}/{stats.totalDays}</li>
              </ul>
            </div>

            {renderRecommendation(stats.daysHitCalories, stats.totalDays, 'kalorijų')}
            {renderRecommendation(stats.daysHitExercise, stats.totalDays, 'exercise')}
            {renderRecommendation(stats.daysHitStand, stats.totalDays, 'standing hours')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
