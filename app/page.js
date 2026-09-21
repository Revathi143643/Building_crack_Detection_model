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

  return (
    <main className="page-shell">
      <section className="app-frame">
        <header className="topbar">
          <div className="brand-mark" aria-hidden="true">SS</div>
          <div>
            <p className="kicker">Field intelligence / 01</p>
            <p className="brand-name">Structure Scan</p>
          </div>
          <span className="service-status"><i /> Model ready</span>
        </header>

        <div className="content-grid">
          <section className="intro">
            <p className="kicker">Surface assessment</p>
            <h1>See the small signs before they become big repairs.</h1>
            <p className="intro-copy">Upload a clear photo of a wall, beam, or foundation. The trained vision model will flag visible crack patterns for an early inspection signal.</p>
            <div className="signal-list">
              <span><b>01</b> Image-based screening</span>
              <span><b>02</b> Confidence scored</span>
              <span><b>03</b> Human inspection remains essential</span>
            </div>
          </section>

          <section className="scan-panel" aria-label="Crack analysis">
            <label className={`dropzone ${preview ? 'has-image' : ''}`} htmlFor="image-upload">
              {preview ? <img src={preview} alt="Selected building surface" /> : <span className="dropzone-placeholder"><strong>Drop a site image here</strong><small>JPG, PNG or WEBP / up to 10 MB</small></span>}
              <input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} />
            </label>
            <div className="scan-actions">
              <span className="file-name">{file ? file.name : 'No image selected'}</span>
              <button type="button" onClick={analyze} disabled={isLoading}>{isLoading ? 'Reading image...' : 'Run assessment'} <span aria-hidden="true">↗</span></button>
            </div>
            {error && <p className="message error">{error}</p>}
            {result && <div className={`result ${result.has_crack ? `severity-${result.severity.toLowerCase()}` : 'clear'}`}><div><p className="kicker">Assessment result</p><h2>{result.label}</h2>{result.has_crack && <span className="severity-badge">{result.severity} severity</span>}</div><strong>{Math.round(result.confidence * 100)}%</strong><p>{result.has_crack ? result.recommendation || getSeverityMessage(result.severity) : 'No visible crack-like pattern detected in this image.'}</p><small className="result-note">Confidence-based screening only. It is not a structural safety certification.</small></div>}
          </section>
        </div>
        <footer>AI screening tool <span>•</span> Not a structural safety certification</footer>
      </section>
    </main>
  );
}