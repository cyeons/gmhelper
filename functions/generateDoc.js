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
  다음은 초등학교 공문서 형식에 맞춰 항목과 구조가 정리된 초안입니다.
  표현이 어색하거나 공문 문체에 맞지 않는 경우에만 고치십시오.
  
  ※ 반드시 지켜야 할 규칙:
  - 문장의 구조, 순서, 항목, 들여쓰기를 변경하지 마십시오.
  - 초안에 없는 내용을 덧붙이지 마십시오.
  - 인사말, 결론, 감사 표현은 추가하지 마십시오.
  - 문장은 "~합니다", "~하고자 합니다" 등 공문 표현으로 자연스럽게 정리하십시오.
  - 문서 마지막 문장의 끝에는 "  끝."을 같은 줄에 붙여 작성하십시오.
  
  ${promptRules}
  
  초안:
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
