'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function selectFile(event) {
    const selectedFile = event.target.files?.[0];
    setFile(selectedFile || null);
    setResult(null);
    setError('');
  }

  async function analyze() {
    if (!file) {
      setError('Choose a building image first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      let response;
      let data;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch('/api/predict', { method: 'POST', body: formData });
        data = await response.json();
        if (response.status !== 502 && response.status !== 503) break;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      if (!response.ok) throw new Error(data.error || 'Analysis failed.');
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  function getSeverityMessage(severity) {
    if (severity === 'High') return 'High concern: arrange an on-site structural inspection as soon as possible.';
    if (severity === 'Medium') return 'Medium concern: schedule an inspection and monitor this area for changes.';
    return 'Low concern: document this area and inspect again if the crack grows or changes.';
  }

  const confidencePercent = result ? Math.round(result.confidence * 100) : 0;

  return (
    <main className="page-shell">
      <section className="app-frame">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><span>SS</span></div>
            <div>
              <p className="kicker">Field intelligence / 01</p>
              <p className="brand-name">Structure Scan</p>
            </div>
          </div>
          <div className="topbar-meta">
            <span className="service-status"><i /> Model online</span>
            <span className="topbar-date">Screening desk</span>
          </div>
        </header>

        <div className="content-grid">
          <section className="intro">
            <div className="eyebrow-row"><span className="eyebrow-dot" /> Surface assessment</div>
            <h1>Spot the change<br /><em>before it spreads.</em></h1>
            <p className="intro-copy">A fast visual screening layer for walls, beams, foundations, and other structural surfaces.</p>
            <div className="signal-list">
              <span><b>01</b><strong>Upload</strong> a clear site image</span>
              <span><b>02</b><strong>Screen</strong> for crack-like patterns</span>
              <span><b>03</b><strong>Escalate</strong> with a confidence signal</span>
            </div>
            <p className="intro-note">Designed for early awareness. Always confirm findings with a qualified professional.</p>
          </section>

          <section className="scan-panel" aria-label="Crack analysis">
            <div className="panel-heading">
              <div><p className="kicker">New assessment</p><h2>Inspect a surface</h2></div>
              <span className="step-count">01 / 01</span>
            </div>
            <label className={`dropzone ${preview ? 'has-image' : ''}`} htmlFor="image-upload">
              {preview ? <><img src={preview} alt="Selected building surface" /><span className="image-chip">Image ready</span></> : <span className="dropzone-placeholder"><span className="upload-icon" aria-hidden="true">+</span><strong>Drop a site image here</strong><small>JPG, PNG or WEBP / up to 10 MB</small></span>}
              <input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} />
            </label>
            <div className="scan-actions">
              <div className="file-detail"><span className="file-dot" /> <span className="file-name">{file ? file.name : 'No image selected'}</span></div>
              <button type="button" onClick={analyze} disabled={isLoading}>{isLoading ? 'Reading image...' : 'Run assessment'} <span aria-hidden="true">&#8599;</span></button>
            </div>
            <p className="privacy-note">Your image is used for this assessment and is not stored by the interface.</p>
            {error && <p className="message error">{error}</p>}
            {result && <div className={`result ${result.has_crack ? `severity-${result.severity?.toLowerCase() || 'low'}` : 'clear'}`}>
              <div className="result-header"><div><p className="kicker">Assessment result</p><h2>{result.label}</h2>{result.has_crack && result.severity && <span className="severity-badge">{result.severity} severity</span>}</div><div className="score"><strong>{confidencePercent}%</strong><span>confidence</span></div></div>
              <div className="confidence-track"><span style={{ width: `${confidencePercent}%` }} /></div>
              <p className="result-message">{result.has_crack ? result.recommendation || getSeverityMessage(result.severity) : 'No visible crack-like pattern detected in this image.'}</p>
              <small className="result-note">Confidence-based screening only. It is not a structural safety certification.</small>
            </div>}
          </section>
        </div>
        <footer><span>AI screening tool</span><span>Confidence is not structural severity</span><span>Human inspection remains essential</span></footer>
      </section>
    </main>
  );
}