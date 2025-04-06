const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청 데이터' }) };
  }

  const { relatedDocs = [], content = '', attachments = [] } = body;
  if (!content.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: '필수 항목(본문)이 누락되었습니다.' }) };
  }

  const hasRelated = relatedDocs.length > 0 && relatedDocs.some(doc => doc.dept && doc.docNumber && doc.docDate);
  const hasAttachments = attachments.length > 0 && attachments.some(att => att.attachment);
  const contentLines = content.split('\n').filter(Boolean);
  const firstLine = contentLines[0] || '';
  const validAttachments = attachments.filter(att => att.attachment);

  // 문서 형식 조립
  let rawDraft = '';
  if (hasRelated) {
    const hasTitles = relatedDocs.some(doc => doc.docTitle);
    rawDraft += `1. 관련: `;
    relatedDocs.forEach((doc, index) => {
      const formattedDate = doc.docDate
        ? doc.docDate.replace(/년|월|일/g, '').replace(/\\s+/g, ' ').trim().replace(/\\./g, '.').replace(/\\s/g, ' ') + '.'
        : '';
      const deptDocNumber = doc.dept && doc.docNumber ? `${doc.dept}-${doc.docNumber}` : '';
      if (!deptDocNumber || !formattedDate) return;
      if (hasTitles) {
        rawDraft += `${index > 0 ? '\n          ' : ''}${deptDocNumber}(${formattedDate})${doc.docTitle ? ` "${doc.docTitle}"` : ''}`;
      } else {
        rawDraft += `${index > 0 ? ', ' : ''}${deptDocNumber}(${formattedDate})`;
      }
    });
    rawDraft += '\n\n';
  }

  rawDraft += `${hasRelated ? '2' : '1'}. ${firstLine}\n`;
  if (contentLines.length > 1) {
    rawDraft += contentLines.slice(1).map(line => `  ${line}`).join('\n') + '\n';
  }

  if (hasAttachments) {
    rawDraft += `\n붙임`;
    if (validAttachments.length === 1) {
      const att = validAttachments[0];
      rawDraft += `\n  ${att.attachment} ${att.count}부.  끝.`;
    } else {
      validAttachments.forEach((att, index) => {
        rawDraft += `\n  ${index + 1}. ${att.attachment} ${att.count}부.${index === validAttachments.length - 1 ? '  끝.' : ''}`;
      });
    }
  } else {
    rawDraft += '  끝.';
  }

  // 📄 외부 prompt 규칙 파일 불러오기
  const rulePath = path.join(__dirname, 'promptRules.txt');
  let promptRules = '';
  try {
    promptRules = fs.readFileSync(rulePath, 'utf-8');
  } catch (e) {
    console.error('promptRules.txt 파일을 불러올 수 없습니다:', e);
  }

  const prompt = `
다음은 초등학교 공문서 형식에 맞게 구성된 초안입니다.
이 초안의 표현이 어색하거나 관례에 맞지 않는 경우, 공문 문체로 자연스럽게 다듬어 주세요.

${promptRules}

📝 아래 문서 초안을 다듬어 주세요:

${rawDraft}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const generatedDoc = response.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ generatedDoc }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '공문서 생성 중 오류: ' + error.message }),
    };
  }
};
