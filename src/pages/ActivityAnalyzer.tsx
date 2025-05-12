import React, { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [data, setData] = useState<ActivityData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const fileRef = useRef<File | null>(null);

  // Iš tekstinio fragmento ištraukia ActivitySummary eiles
  const extractActivityXml = (text: string): string => {
    const regex = /<ActivitySummary\b[^>]*\/?>/g;
    const matches = text.match(regex);
    return matches ? matches.join('') : '';
  };

  // Parsina XML fragmentą į masyvą
  const parseXmlData = (fragment: string): ActivityData[] => {
    const wrapped = `<root>${fragment}</root>`;
    const parser = new DOMParser();
    const xml = parser.parseFromString(wrapped, 'application/xml');
    return Array.from(xml.getElementsByTagName('ActivitySummary')).map(e => ({
      date: e.getAttribute('dateComponents') || '',
      calories: parseFloat(e.getAttribute('activeEnergyBurned') || '0'),
      caloriesGoal: parseFloat(e.getAttribute('activeEnergyBurnedGoal') || '0'),
      exercise: parseFloat(e.getAttribute('appleExerciseTime') || '0'),
      exerciseGoal: parseFloat(e.getAttribute('appleExerciseTimeGoal') || '0'),
      stand: parseFloat(e.getAttribute('appleStandHours') || '0'),
      standGoal: parseFloat(e.getAttribute('appleStandHoursGoal') || '0'),
    }));
  };

  // Filtravimas pagal datų intervalą
  const filterByDate = (entries: ActivityData[]): ActivityData[] => {
    if (!startDate || !endDate) return entries;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return entries.filter(d => {
      const cur = new Date(d.date);
      return cur >= start && cur <= end;
    });
  };

  // Apskaičiavimai
  const computeStats = (entries: ActivityData[]): Stats => {
    const totalDays = entries.length;
    const maxCalories = Math.max(...entries.map(d => d.calories));
    const maxExercise = Math.max(...entries.map(d => d.exercise));
    const maxStand = Math.max(...entries.map(d => d.stand));
    const sumCalories = entries.reduce((s, d) => s + d.calories, 0);
    const sumExercise = entries.reduce((s, d) => s + d.exercise, 0);
    const sumStand = entries.reduce((s, d) => s + d.stand, 0);
    const avgCalories = sumCalories / totalDays;
    const avgExercise = sumExercise / totalDays;
    const avgStand = sumStand / totalDays;
    const daysHitCalories = entries.filter(d => d.calories >= d.caloriesGoal).length;
    const daysHitExercise = entries.filter(d => d.exercise >= d.exerciseGoal).length;
    const daysHitStand = entries.filter(d => d.stand >= d.standGoal).length;
    return { totalDays, maxCalories, maxExercise, maxStand, avgCalories, avgExercise, avgStand, daysHitCalories, daysHitExercise, daysHitStand };
  };

  // Pagrindinė analizės funkcija, nustato data = filtered
  const handleAnalyze = async () => {
    if (!fileRef.current) { alert('Pirmiausia įkelkite XML failą.'); return; }
    const file = fileRef.current;
    try {
      let xmlContent: string;
      if (file.size > 10_000_000) {
        const tailSize = 5_000_000;
        const start = file.size > tailSize ? file.size - tailSize : 0;
        xmlContent = await file.slice(start).text();
      } else {
        xmlContent = await file.text();
      }
      const fragment = extractActivityXml(xmlContent);
      const parsed = parseXmlData(fragment);
      const filtered = filterByDate(parsed);
      setData(filtered);
      setStats(computeStats(filtered));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert('Klaida apdorojant failą: ' + err.message);
    }
  };

  // Failo pasirinkimas
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    fileRef.current = f;
    if (f) {
      f.text().then(t => setXmlText(t));
    }
    setStats(null);
  };

  const renderRecommendation = (hit: number, total: number, label: string) => {
    const rate = hit / total;
    if (rate >= 0.8) {
      return <p>🔔 Rekomendacija: pabandykite <strong>padidinti</strong> {label} tikslą (pasiekiate {Math.round(rate * 100)}% dienų).</p>;
    }
    if (rate <= 0.3) {
      return <p>🔔 Rekomendacija: apsvarstykite <strong>sumažinti</strong> {label} tikslą (pasiekiate tik {Math.round(rate * 100)}% dienų).</p>;
    }
    return null;
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card>
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Įkelkite visą sveikatos XML</h2>
          <input type="file" accept=".xml" onChange={handleFileChange} className="mb-2" />
          <textarea
            rows={4}
            value={xmlText}
            onChange={e => setXmlText(e.target.value)}
            placeholder="Įklijuokite XML..."
            className="w-full p-2 border rounded mb-2"
          />
          <div className="flex space-x-2 mb-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2 rounded flex-1" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2 rounded flex-1" />
          </div>
          <Button className="bg-blue-500 text-white" onClick={handleAnalyze}>Analizuoti</Button>
        </CardContent>
      </Card>

      {stats && data.length > 0 && (
        <>
          <Card>
            <CardContent>
              <h2 className="text-xl font-bold mb-2">Rezultatai ({stats.totalDays} dienos)</h2>

              <div className="mb-4">
                <ul className="list-disc list-inside">
                  <li>🔥 Daugiausiai sudegintų kalorijų per dieną: {stats.maxCalories.toFixed(2)}</li>
                  <li>🏃‍♂️ Daugiausiai exercise minučių per dieną: {stats.maxExercise.toFixed(0)}</li>
                  <li>🚶‍♂️ Daugiausiai standing valandų per dieną: {stats.maxStand.toFixed(0)}</li>
                </ul>
              </div>

              <div className="mb-4">
                <ul className="list-disc list-inside">
                  <li>🔥 Vidutiniškai sudeginama kalorijų per dieną: {stats.avgCalories.toFixed(2)}</li>
                  <li>🏃‍♂️ Vidutiniškai exercise minučių per dieną: {stats.avgExercise.toFixed(2)}</li>
                  <li>🚶‍♂️ Vidutiniškai standing valandų per dieną: {stats.avgStand.toFixed(2)}</li>
                </ul>
              </div>

              <div className="mb-2">
                <ul className="list-disc list-inside">
                  <li>🔥 Dienų, kai pasiekė kalorijų tikslą: {stats.daysHitCalories}/{stats.totalDays}</li>
                  <li>🏃‍♂️ Dienų, kai pasiekė exercise tikslą: {stats.daysHitExercise}/{stats.totalDays}</li>
                  <li>🚶‍♂️ Dienų, kai pasiekė standing hours tikslą: {stats.daysHitStand}/{stats.totalDays}</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Grafikai */}
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Kalorijų grafikas</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="calories" name="Sudeginta" stroke="#8884d8" />
                  <Line type="monotone" dataKey="caloriesGoal" name="Tikslas" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>

              <h3 className="text-lg font-semibold mb-2 mt-4">Exercise minučių grafikas</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="exercise" name="Exercise" stroke="#8884d8" />
                  <Line type="monotone" dataKey="exerciseGoal" name="Tikslas" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>

              <h3 className="text-lg font-semibold mb-2 mt-4">Standing valandų grafikas</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="stand" name="Standing" stroke="#8884d8" />
                  <Line type="monotone" dataKey="standGoal" name="Tikslas" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>

              {/* Rekomendacijos */}
              <div className="mt-4">
                {stats && renderRecommendation(stats.daysHitCalories, stats.totalDays, 'kalorijų')}
                {stats && renderRecommendation(stats.daysHitExercise, stats.totalDays, 'exercise')}
                {stats && renderRecommendation(stats.daysHitStand, stats.totalDays, 'standing hours')}
              </div>

            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
