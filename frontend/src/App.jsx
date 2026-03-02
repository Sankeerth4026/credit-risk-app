import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts'
import { Upload, User, Activity, AlertCircle, ChevronRight, Loader2, Download, FileSpreadsheet, TrendingUp } from 'lucide-react'
import styles from './App.module.css'

const API = 'https://credit-risk-app-x0cz.onrender.com'

const RISK = {
  P1: { label: 'Very Low Risk',  color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)'  },
  P2: { label: 'Low Risk',       color: '#84cc16', bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.25)' },
  P3: { label: 'Moderate Risk',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  P4: { label: 'High Risk',      color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'  },
}

function RiskCard({ result }) {
  const meta = RISK[result.risk_code]
  const probData = Object.entries(result.probabilities).map(([code, val]) => ({
    name: code, value: val, fill: RISK[code]?.color ?? '#fff',
  }))

  return (
    <div className={styles.riskCard} style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
      <div className={styles.riskCardInner}>
        <div className={styles.riskLeft}>
          <div className={styles.riskCode} style={{ color: meta.color }}>{result.risk_code}</div>
          <div className={styles.riskLabel}>{result.risk_label}</div>
          <div className={styles.riskDesc}>{result.description}</div>
        </div>
        <div className={styles.riskRight}>
          <div className={styles.confidenceVal} style={{ color: meta.color }}>{result.confidence}%</div>
          <div className={styles.confidenceLbl}>Confidence</div>
          <div className={styles.confidenceBar}>
            <div className={styles.confidenceFill} style={{ width: `${result.confidence}%`, background: meta.color }} />
          </div>
        </div>
      </div>
      <div className={styles.probGrid}>
        {probData.map(({ name, value, fill }) => (
          <div key={name} className={styles.probItem}>
            <div className={styles.probHeader}>
              <span style={{ color: fill, fontWeight: 700, fontSize: '0.8rem' }}>{name}</span>
              <span className={styles.probVal}>{value}%</span>
            </div>
            <div className={styles.probBar}>
              <div className={styles.probFill} style={{ width: `${value}%`, background: fill }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SingleTab({ schema }) {
  const [values, setValues]   = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  const numCols = schema?.num_cols ?? []
  const catCols = schema?.cat_cols ?? []
  const handleChange = (k, v) => setValues(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const { data } = await axios.post(`${API}/predict/single`, { features: values })
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Prediction failed. Is the backend running?')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.singleLayout}>
      {numCols.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Numeric Features</div>
          <div className={styles.formGrid}>
            {numCols.map(col => (
              <div key={col} className={styles.field}>
                <label className={styles.fieldLabel}>{col}</label>
                <input type="number" step="any" className={styles.input}
                  value={values[col] ?? ''} onChange={e => handleChange(col, e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>
        </>
      )}

      {catCols.length > 0 && (
        <>
          <div className={styles.sectionLabel} style={{ marginTop: 28 }}>Categorical Features</div>
          <div className={styles.formGrid}>
            {catCols.map(col => (
              <div key={col} className={styles.field}>
                <label className={styles.fieldLabel}>{col}</label>
                <input type="text" className={styles.input}
                  value={values[col] ?? ''} onChange={e => handleChange(col, e.target.value)} placeholder="value" />
              </div>
            ))}
          </div>
        </>
      )}

      {!schema && (
        <div className={styles.noSchema}>
          <AlertCircle size={18} />
          <span>Wait!! the model to load..... </span>
        </div>
      )}

      <div className={styles.actionRow}>
        <button className={styles.predictBtn} onClick={handleSubmit} disabled={loading || !schema}>
          {loading ? <Loader2 size={16} className={styles.spinnerIcon} /> : <ChevronRight size={16} />}
          {loading ? 'Analyzing…' : 'Predict Risk'}
        </button>
      </div>

      {error && <div className={styles.errorBox}><AlertCircle size={16} /> {error}</div>}

      {result && (
        <div className={styles.resultFull}>
          <div className={styles.sectionLabel}><TrendingUp size={14} style={{ display: 'inline', marginRight: 6 }} />Prediction Result</div>
          <RiskCard result={result} />
        </div>
      )}
    </div>
  )
}

function BatchTab({ schema }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)

  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) setFile(f)
  }, [])

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    const form = new FormData(); form.append('file', file)
    try {
      const { data } = await axios.post(`${API}/predict/batch`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(data)
    } catch (e) { setError(e.response?.data?.detail ?? 'Batch prediction failed.')
    } finally { setLoading(false) }
  }

  const downloadCSV = () => {
    if (!result) return
    const blob = new Blob(['Row,Risk_Code,Risk_Label,Confidence\n' +
      result.results.map(r => `${r.row},${r.risk_code},${r.risk_label},${r.confidence}`).join('\n')
    ], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'batch_predictions.csv'; a.click()
  }

  const downloadTemplate = () => {
    if (!schema) return
    const blob = new Blob([schema.all_cols.join(',') + '\n'], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'applicant_template.csv'; a.click()
  }

  const distData = result
    ? Object.entries(result.distribution).map(([code, count]) => ({ name: code, count, fill: RISK[code]?.color ?? '#fff' }))
    : []

  return (
    <div className={styles.batchLayout}>

      <div className={styles.uploadRow}>
        <div
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${file ? styles.dropzoneFilled : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input id="fileInput" type="file" accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          {file ? (
            <>
              <FileSpreadsheet size={36} color="#3b82f6" />
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB · ready to score</div>
            </>
          ) : (
            <>
              <Upload size={36} color="#334155" />
              <div className={styles.dropText}>Drop your CSV or Excel file here</div>
              <div className={styles.dropSub}>Supports .csv · .xlsx · .xls</div>
            </>
          )}
        </div>

        <div className={styles.uploadActions}>
          {schema && (
            <button className={styles.templateBtn} onClick={downloadTemplate}>
              <Download size={14} /> Download Template
            </button>
          )}
          <button className={styles.predictBtn} onClick={handleSubmit} disabled={!file || loading}>
            {loading ? <Loader2 size={16} className={styles.spinnerIcon} /> : <Activity size={16} />}
            {loading ? 'Processing…' : 'Run Batch Prediction'}
          </button>
          {error && <div className={styles.errorBox}><AlertCircle size={16} /> {error}</div>}
        </div>
      </div>
      {result && (
        <div className={styles.batchResults}>
          <div className={styles.metricsRow}>
            <div className={styles.metricCard} style={{ borderColor: '#3b82f6' }}>
              <div className={styles.metricVal} style={{ color: '#3b82f6' }}>{result.total.toLocaleString()}</div>
              <div className={styles.metricLbl}>Total Scored</div>
            </div>
            {['P1','P2','P3','P4'].map(code => (
              <div key={code} className={styles.metricCard} style={{ borderColor: RISK[code].border }}>
                <div className={styles.metricVal} style={{ color: RISK[code].color }}>
                  {(result.distribution[code] ?? 0).toLocaleString()}
                </div>
                <div className={styles.metricLbl}>{code} — {RISK[code].label}</div>
              </div>
            ))}
          </div>

          <div className={styles.chartSection}>
            <div className={styles.chartBox}>
              <div className={styles.chartTitle}>Risk Distribution — Bar Chart</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={distData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 14, fontFamily: 'Outfit', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1c2840', borderRadius: 10, fontFamily: 'Outfit', fontSize: 13, color: '#dde4f0' }}labelStyle={{ color: "#94a3b8", fontWeight: 600 }} itemStyle={{ color: "#dde4f0" }} cursor={{ fill: 'rgba(255, 255, 255, 0)' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={90}>
                    {distData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.chartBox}>
              <div className={styles.chartTitle}>Risk Distribution — Pie Chart</div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={distData} dataKey="count" nameKey="name" cx="50%" cy="45%" outerRadius={95} innerRadius={52} paddingAngle={3}>
                    {distData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1c2840', borderRadius: 10, fontFamily: 'Outfit', fontSize: 13, color: '#dde4f0' }}labelStyle={{ color: "#94a3b8", fontWeight: 600 }} itemStyle={{ color: "#dde4f0" }} />
                  <Legend formatter={value => <span style={{ color: '#94a3b8', fontFamily: 'Outfit', fontSize: 13 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={styles.tableSection}>
            <div className={styles.tableTitleRow}>
              <div className={styles.chartTitle}>Results Preview</div>
              <button className={styles.downloadBtn} onClick={downloadCSV}>
                <Download size={13} /> Download Full CSV
              </button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Risk Flag</th><th>Label</th><th>Confidence</th></tr></thead>
                <tbody>
                  {result.results.slice(0, 100).map(r => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td><span className={styles.badge} style={{ color: RISK[r.risk_code]?.color, background: RISK[r.risk_code]?.bg, border: `1px solid ${RISK[r.risk_code]?.border}` }}>{r.risk_code}</span></td>
                      <td>{r.risk_label}</td>
                      <td style={{ color: RISK[r.risk_code]?.color, fontWeight: 600 }}>{r.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.results.length > 100 && (
                <div className={styles.tableMore}>Showing 100 of {result.results.length} rows — download CSV for all</div>
              )}
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className={styles.emptyResult}>
          <FileSpreadsheet size={52} strokeWidth={1} color="#1e2d50" />
          <p>Upload a file and click <strong>Run Batch Prediction</strong></p>
        </div>
      )}
    </div>
  )
}
export default function App() {
  const [tab, setTab]         = useState('single')
  const [schema, setSchema]   = useState(null)
  const [modelOk, setModelOk] = useState(null)

  useEffect(() => {
    axios.get(`${API}/health`).then(({ data }) => setModelOk(data.model_loaded)).catch(() => setModelOk(false))
    axios.get(`${API}/schema`).then(({ data }) => setSchema(data)).catch(() => {})
  }, [])

  return (
    <div className={styles.app}>
      <div className={styles.bgGrid} aria-hidden />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            CreditRisk<span className={styles.logoAccent}>AI</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusDot} style={{
              background: modelOk === true ? '#22c55e' : modelOk === false ? '#ef4444' : '#334155',
              animation: modelOk === true ? 'pulse-ring 2s infinite' : 'none'
            }} />
            <span className={styles.statusTxt} style={{ color: modelOk === false ? '#ef4444' : '#7a8aaa' }}>
              {modelOk === true ? 'Model Ready' : modelOk === false ? 'Model Offline' : 'Connecting…'}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroTag}>Logistic Regression · P1–P4 Classification</div>
        <h1 className={styles.heroTitle}>Credit Risk Assessment</h1>
        <p className={styles.heroSub}>Instant ML-powered credit risk scoring — single applicant or bulk batch processing.</p>
      </div>

      <div className={styles.container}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'single' ? styles.tabActive : ''}`} onClick={() => setTab('single')}>
            <User size={15} /> Single Applicant
          </button>
          <button className={`${styles.tab} ${tab === 'batch' ? styles.tabActive : ''}`} onClick={() => setTab('batch')}>
            <Upload size={15} /> Batch Upload
          </button>
        </div>
        <div className={styles.panel}>
          {tab === 'single' ? <SingleTab schema={schema} /> : <BatchTab schema={schema} />}
        </div>
      </div>
    </div>
  )
}