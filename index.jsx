import React, { useState } from 'react';
import ReactDOM from 'react-dom';

const App = () => {
  const [showModal, setShowModal] = useState(true);

  const handleConfirm = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className="container">
        <div className="input-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>1. 관련 문서 (선택)</h2>
            <button className="add-btn" onClick={addRelated}>+</button>
          </div>
          <div className="related-group">
            <div className="related-line1">
              <div><label>부서명</label><input type="text" className="dept" /></div>
              <div><label>문서번호</label><input type="text" className="docNumber" /></div>
              <div><label>시행날짜</label><input type="text" className="docDate" /></div>
            </div>
            <div className="related-line2"><label>제목</label><input type="text" className="docTitle" /></div>
          </div>

          <h2>2. 본문 (필수)</h2>
          <label htmlFor="content">본문 내용</label>
          <textarea id="content"></textarea>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>3. 붙임 (선택)</h2>
            <button className="add-btn" onClick={addAttachment}>+</button>
          </div>
          <div className="attachment-group">
            <div className="attachment-line">
              <div><label>첨부 자료</label><input type="text" className="attachment" /></div>
              <div><label>부수</label><input type="number" className="attachmentCount" min="1" value="1" /></div>
            </div>
          </div>

          <button onClick={generateDoc}>공문서 생성</button>
        </div>
        <div className="output-section">
          <h2>생성된 공문서</h2>
          <div id="loading"></div>
          <pre id="output">여기에 공문서가 표시됩니다.</pre>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>주의사항</h3>
            <p>
              본 서비스는 외부 ChatGPT API를 사용하므로, 내부 비밀문서나 개인정보(이름, 주민번호 등)를 입력하면 유출 위험이 있습니다.<br />
              기밀 정보 및 개인정보는 제외하고 입력해주세요.
            </p>
            <button onClick={handleConfirm}>확인</button>
          </div>
        </div>
      )}

      <style>{`
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f7fa; color: #333; }
        .container { display: flex; gap: 20px; max-width: 1200px; margin: 0 auto; }
        .input-section, .output-section { flex: 1; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h2 { font-size: 18px; color: #34495e; margin: 15px 0 10px; }
        label { display: block; margin: 10px 0 5px; font-weight: 500; }
        .related-group, .attachment-group { margin-bottom: 10px; }
        .related-line1, .attachment-line { display: flex; gap: 10px; margin-bottom: 5px; }
        input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
        .related-line1 input { flex: 1; }
        #docNumber, #docDate { flex: 0.8; }
        #docTitle { width: 100%; }
        textarea#content { min-height: 150px; }
        #attachment { flex: 5; }
        #attachmentCount { flex: 0.3; max-width: 60px; text-align: center; }
        .add-btn { background: #2ecc71; color: white; padding: 2px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        .add-btn:hover { background: #27ae60; }
        button { background-color: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 15px; }
        button:hover { background-color: #2980b9; }
        #output { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
        #loading { display: none; width: 20px; height: 20px; border: 3px solid #ddd; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }
        .modal h3 { margin: 0 0 15px; color: #34495e; }
        .modal p { margin: 0 0 20px; line-height: 1.5; }
        .modal button { background: #3498db; padding: 8px 20px; }
        .modal button:hover { background: #2980b9; }
      `}</style>
    </>
  );
};

// 동적 추가 함수 (React에서는 상태로 관리해야 하지만, 기존 로직 유지)
function addRelated() {
  const group = document.querySelector('.related-group');
  const newRelated = group.querySelector('.related-line1').parentNode.cloneNode(true);
  newRelated.querySelectorAll('input').forEach(input => input.value = '');
  group.appendChild(newRelated);
}

function addAttachment() {
  const group = document.querySelector('.attachment-group');
  const newAttachment = group.children[0].cloneNode(true);
  newAttachment.querySelectorAll('input').forEach(input => input.value = input.type === 'number' ? '1' : '');
  group.appendChild(newAttachment);
}

async function generateDoc() {
  const relatedDocs = Array.from(document.querySelectorAll('.related-group .related-line1')).map(line => ({
    dept: line.querySelector('.dept').value,
    docNumber: line.querySelector('.docNumber').value,
    docDate: line.querySelector('.docDate').value,
    docTitle: line.nextElementSibling.querySelector('.docTitle').value
  }));
  const content = document.getElementById('content').value;
  const attachments = Array.from(document.querySelectorAll('.attachment-line')).map(line => ({
    attachment: line.querySelector('.attachment').value,
    count: line.querySelector('.attachmentCount').value || '1'
  }));

  if (!content) {
    document.getElementById('output').innerText = '필수 항목(본문)을 입력해주세요.';
    return;
  }

  const output = document.getElementById('output');
  const loading = document.getElementById('loading');
  output.innerText = '';
  loading.style.display = 'block';

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocal ? 'http://localhost:8888' : '';
  const functionUrl = `${baseUrl}/.netlify/functions/generateDoc`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relatedDocs, content, attachments }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`서버 오류: ${response.status} - ${text}`);
    }
    const data = await response.json();
    output.innerText = data.generatedDoc || data.error;
  } catch (error) {
    output.innerText = '오류 발생: ' + error.message;
  } finally {
    loading.style.display = 'none';
  }
}

ReactDOM.render(<App />, document.getElementById('root'));