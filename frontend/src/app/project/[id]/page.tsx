// frontend/src/app/project/[id]/page.tsx
"use client";
import { useEffect, useState, use } from 'react';

export default function ProjectRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolvedParams.id) return;
    fetch(`http://127.0.0.1:8000/api/v1/projects/${resolvedParams.id}/risk`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [resolvedParams.id]);

  if (loading) return <div className="p-8 text-center">Loading Risk Fingerprint...</div>;
  if (!data || data.detail) return <div className="p-8 text-center text-red-500">{data?.detail || "Project Not Found"}</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-8 border border-gray-200">
        <header className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{data.project_id}</h1>
            <p className="text-gray-500 mt-2">{data.description}</p>
            <div className="flex gap-4 mt-4">
              <span className="px-3 py-1 bg-gray-100 text-sm font-medium rounded-md">{data.district}, {data.state}</span>
              <span className="px-3 py-1 bg-gray-100 text-sm font-medium rounded-md">{data.mp_name}</span>
            </div>
          </div>
          <div className={`px-6 py-4 rounded-lg text-center ${data.risk_level === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            <div className="text-sm font-bold uppercase tracking-wider mb-1">Overall Risk</div>
            <div className="text-xxl font-extrabold">{data.risk_score}</div>
            <div className="text-sm mt-1">{data.risk_level}</div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
              Risk Fingerprint
            </h2>
            <div className="space-y-4">
              {Object.entries(data.signals).map(([key, val]: any) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <span className="font-medium capitalize text-gray-700">{key.replace('_', ' ')}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${val > 25 ? 'bg-red-500' : val > 10 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                        style={{ width: `${Math.min(val * 2, 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold text-gray-600">-{val}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-lg">
              <h3 className="font-bold text-blue-900 mb-2">Recommendation</h3>
              <p className="text-blue-800">{data.recommendation}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span>
              Why was this flagged?
            </h2>
            <div className="space-y-4">
              {data.explanations.map((exp: any, idx: number) => (
                <div key={idx} className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-red-800 uppercase">{exp.type.replace('_', ' ')}</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-800 rounded">{exp.severity}</span>
                  </div>
                  <p className="text-red-900">{exp.reason}</p>
                </div>
              ))}
              {data.explanations.length === 0 && (
                <p className="text-gray-500 italic p-4 bg-gray-50 rounded-lg border">No critical anomalies detected.</p>
              )}
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">3</span>
              Financial Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm text-gray-500 mb-1">Sanctioned</div>
                <div className="font-bold text-gray-900">INR {data.sanctioned_amount}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm text-gray-500 mb-1">Expenditure</div>
                <div className="font-bold text-gray-900">INR {data.expenditure}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border col-span-2">
                <div className="text-sm text-gray-500 mb-1">Physical Progress</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style= {{ width: `${data.physical_progress}%` }} />
                  </div>
                  <span className="font-bold text-gray-900">{data.physical_progress}%</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}