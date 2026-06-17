import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // App States
  const [activeTab, setActiveTab] = useState('submit');
  const [submissions, setSubmissions] = useState([]);
  const [inputUrl, setInputUrl] = useState('');
  const [policies, setPolicies] = useState([]);
  const [pendingAppeals, setPendingAppeals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [activeAppealSubId, setActiveAppealSubId] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      fetchInitialData();
    } else {
      localStorage.clear();
    }
  }, [token, user]);

  const fetchInitialData = () => {
    fetchHistory();
    fetchPolicies();
    if (user?.role === 'Admin') {
      fetchAdminData();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
      } else {
        alert(data.message);
      }
    } catch {
      alert('Failed connecting to backend container service.');
    }
  };

  const fetchHistory = async () => {
    const res = await fetch(`${API_URL}/submissions/my-history`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSubmissions(await res.json());
  };

  const fetchPolicies = async () => {
    const res = await fetch(`${API_URL}/policies`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPolicies(await res.json());
  };

  const fetchAdminData = async () => {
    const appRes = await fetch(`${API_URL}/admin/appeals/pending`, { headers: { Authorization: `Bearer ${token}` } });
    if (appRes.ok) setPendingAppeals(await appRes.json());
    
    const anRes = await fetch(`${API_URL}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } });
    if (anRes.ok) setAnalytics(await anRes.json());
  };

  const handleSubmission = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ imageUrls: [inputUrl] })
    });
    if (res.ok) {
      setInputUrl('');
      fetchInitialData();
    }
  };

  const handleUpdatePolicy = async (id, updatedFields) => {
    await fetch(`${API_URL}/admin/policies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedFields)
    });
    fetchInitialData();
  };

  const handleFileAppeal = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/appeals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ submissionId: activeAppealSubId, reason: appealReason })
    });
    setActiveAppealSubId(null);
    setAppealReason('');
    alert('Appeal lodged into processing queue.');
  };

  const handleResolveAppeal = async (id, status, adminResponse) => {
    await fetch(`${API_URL}/admin/appeals/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, adminResponse })
    });
    fetchInitialData();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">AI Content Moderation Platform</h2>
          <p className="text-xs text-gray-500 text-center mb-6">MERN Security & Evaluation Blueprint</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">User Email</label>
              <input type="email" placeholder="user@platform.com or admin@platform.com" className="w-full border p-2 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Password</label>
              <input type="password" placeholder="user123 / admin123" className="w-full border p-2 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded transition">Authenticate</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header Banner */}
      <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">ContentGuard Engine</h1>
          <p className="text-xs text-slate-300">Logged in as: {user?.email} ({user?.role})</p>
        </div>
        <button onClick={() => setToken('')} className="bg-red-500 hover:bg-red-600 text-xs px-3 py-1.5 rounded text-white font-medium transition">Logout</button>
      </header>

      {/* Navigation Context Tabs */}
      <div className="flex border-b bg-white border-gray-200">
        <button onClick={() => setActiveTab('submit')} className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'submit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>User Submission Panel</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Auditing History</button>
        {user?.role === 'Admin' && (
          <>
            <button onClick={() => setActiveTab('policies')} className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'policies' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Policy Configuration</button>
            <button onClick={() => setActiveTab('appeals')} className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'appeals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Appeals Queue ({pendingAppeals.length})</button>
            <button onClick={() => setActiveTab('analytics')} className={`px-6 py-3 font-medium text-sm border-b-2 transition ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>System Analytics Dashboard</button>
          </>
        )}
      </div>

      {/* Core Component Containers */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'submit' && (
          <div className="bg-white p-6 shadow rounded-lg max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-4">Inbound Content Screening Pipeline</h3>
            <p className="text-xs text-gray-500 mb-4 bg-slate-100 p-3 rounded">
              💡 <strong>Developer Sandbox Tip:</strong> Include category keywords (e.g., <code>"Violence"</code>, <code>"Symbols"</code>, <code>"Harm"</code>) inside the text string input field below to simulate confidence threshold failures.
            </p>
            <form onSubmit={handleSubmission} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Image URL / Simulation Text payload</label>
                <input type="text" value={inputUrl} onChange={e => setInputUrl(e.target.value)} placeholder="e.g. Graphic Violence instance profile photo" className="w-full border p-2 rounded" required />
              </div>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded shadow text-sm">Dispatch Asset To Screening Pipeline</button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-2">Personal Auditing Ledger</h3>
            {submissions.map((sub) => (
              <div key={sub._id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-indigo-600 mb-1 break-all">{sub.imageUrl}</div>
                  <div className="text-xs text-gray-400 mb-2">Evaluated: {new Date(sub.createdAt).toLocaleString()}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {Object.entries(sub.categoryBreakdown || {}).map(([cat, metric]) => (
                      <div key={cat} className="p-2 bg-gray-50 rounded border text-xs">
                        <span className="font-semibold block text-gray-700">{cat}</span>
                        <span className={`font-medium ${metric.detected ? 'text-red-500' : 'text-green-600'}`}>{metric.score}% Match</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center min-w-[150px]">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full mb-2 ${sub.outcome === 'Approved' ? 'bg-green-100 text-green-800' : sub.outcome === 'Blocked' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{sub.outcome}</span>
                  {sub.outcome !== 'Approved' && (
                    <button onClick={() => { setActiveAppealSubId(sub._id); setActiveTab('appealForm'); }} className="text-xs text-indigo-600 hover:underline">Dispute Verdict (Appeal)</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'appealForm' && (
          <div className="bg-white p-6 shadow rounded-lg max-w-lg mx-auto">
            <h3 className="text-xl font-bold mb-4">Lodge System Dispute Appeal</h3>
            <form onSubmit={handleFileAppeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Written Justification Context</label>
                <textarea rows="4" value={appealReason} onChange={e => setAppealReason(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="Provide operational defense parameters outlining why algorithmic classification framework was anomalous..." required></textarea>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded font-medium">Transmit Appeal</button>
                <button type="button" onClick={() => setActiveTab('history')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-2 rounded font-medium">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Violation Category</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Confidence Cutoff Threshold</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">System Enforcement Response Strategy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {policies.map(p => (
                  <tr key={p._id}>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.category}</td>
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={p.enabled} onChange={e => handleUpdatePolicy(p._id, { enabled: e.target.checked })} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="number" min="1" max="100" value={p.confidenceThreshold} onChange={e => handleUpdatePolicy(p._id, { confidenceThreshold: Number(e.target.value) })} className="w-16 border rounded p-1 text-center" /> %
                    </td>
                    <td className="px-6 py-4">
                      <select value={p.enforcementBehavior} onChange={e => handleUpdatePolicy(p._id, { enforcementBehavior: e.target.value })} className="border rounded p-1 bg-white">
                        <option value="Flag for Review">Flag for Review</option>
                        <option value="Auto-Block">Auto-Block</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'appeals' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-2">Pending Remediation Queues</h3>
            {pendingAppeals.length === 0 ? <p className="text-gray-500 text-sm bg-white p-4 rounded border">No current remediation items awaiting response.</p> : null}
            {pendingAppeals.map(app => (
              <div key={app._id} className="bg-white p-4 border shadow-sm rounded-lg flex flex-col gap-3">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>User Instance: {app.userId?.email}</span>
                  <span>Submitted Asset: {new Date(app.createdAt).toLocaleString()}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded text-xs italic text-gray-700">" {app.reason} "</div>
                <div className="text-xs font-semibold text-red-600 truncate">Asset Vector Context: {app.submissionId?.imageUrl}</div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleResolveAppeal(app._id, 'Accepted', 'Approved following secondary manual inspection context.')} className="bg-green-600 hover:bg-green-700 text-white font-medium text-xs px-3 py-1.5 rounded">Override & Pass Asset</button>
                  <button onClick={() => handleResolveAppeal(app._id, 'Rejected', 'Original verdict upheld. Structural validation violation persisted.')} className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs px-3 py-1.5 rounded">Deny Appeal</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 shadow rounded-lg border-l-4 border-indigo-500">
              <div className="text-sm font-medium text-gray-500 uppercase">Gross Operational Ingestion Volume</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">{analytics.totalSubmissions}</div>
            </div>
            <div className="bg-white p-6 shadow rounded-lg border-l-4 border-emerald-500">
              <div className="text-sm font-medium text-gray-500 uppercase">Remediation Resolution Success Rate</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">{analytics.appealMetrics?.resolutionRate}%</div>
              <div className="text-xs text-gray-400 mt-1">{analytics.appealMetrics?.resolved} of {analytics.appealMetrics?.total} appeals cleared</div>
            </div>
            <div className="bg-white p-6 shadow rounded-lg border-l-4 border-amber-500">
              <div className="text-sm font-medium text-gray-500 uppercase">Verdict Signatures Generated</div>
              <div className="mt-2 space-y-1">
                {analytics.verdictDistribution?.map(v => (
                  <div key={v._id} className="text-xs flex justify-between">
                    <span className="font-semibold text-gray-600">{v._id || 'Approved'}:</span>
                    <span className="text-gray-900">{v.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}