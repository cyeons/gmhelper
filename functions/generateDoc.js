const { OpenAI } = require('openai');

exports.handler = async (event) => {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청 데이터' }) };
  }

  const { relatedDocs, content, attachments } = body;
  if (!content) return { statusCode: 400, body: JSON.stringify({ error: '필수 항목(본문)이 누락되었습니다.' }) };

  const hasRelated = relatedDocs && relatedDocs.length > 0 && relatedDocs.some(doc => doc.dept && doc.docNumber && doc.docDate);
  const hasAttachments = attachments && attachments.length > 0 && attachments.some(att => att.attachment);

  let prompt = `
    다음 규칙을 엄격히 준수하여 공문을 작성하세요:
    - 공문 헤더(학교명, 주소, 수신 등)는 추가하지 말고, 입력값(관련, 본문, 붙임)만 사용해 작성.
    - 항목 기호: "1., 가., 1), 가), (1), (가), ①, ㉮" 순으로 사용, 특수 기호(□, ○, -, ∙) 제외.
    - 표시 위치: 첫째 항목은 왼쪽 처음부터 시작, 둘째부터는 상위 항목에서 공백 2칸 들여쓰기, 기호와 내용 사이는 공백 1칸, 여러 줄은 내용 첫 글자에 정렬, 단일 항목은 기호 없음.
    - 단락: 본문 단락 사이는 한 줄 띄우기, 본문과 붙임 사이도 한 줄 띄움.
    - 날짜: "2025. 3. 14." 형식(공백 포함), 입력값에 공백 추가, 요일(예: (목)) 추가 가능.
    - 관련: "1. 관련: 부서명-문서번호(날짜) \\"제목\\"" 형식, 여러 개일 경우 제목 있으면 개행 후 칸 맞춤, 제목 없으면 ", "로 연결, 제목은 선택 사항.
    - 한자어: 이해 어려운 한자어 사용 금지.
    - 시간: 24시간제, 쌍점 사용(예: 14:30), 범위는 '-'로 연결(예: 10:00-10:50).
    - 본문: 첫 줄은 입력값을 자연스러운 문장으로 보완(예: "안내합니다", "보고하고자 합니다" 등), 나머지 내용은 "가. ", "나. " 등으로 항목화, 하위 항목은 "입니다" 없이 "항목: 내용" 형식.
    - 붙임: 여러 개일 경우 "붙임  1. OOO N부." 형식으로 번호 붙여 칸 맞춰 개행, 하나면 "붙임  OOO N부.", N은 부수(기본값 1).
    - 문서 끝: 마지막 항목 끝에 공백 2칸 후 "끝." 추가.
    - 표기: 한국어 표준 표기법 준수.
    
    아래 입력값을 사용해 공문을 작성:
  `;

  if (hasRelated) {
    const hasTitles = relatedDocs.some(doc => doc.docTitle);
    prompt += `\n      1. 관련: `;
    relatedDocs.forEach((doc, index) => {
      const formattedDate = doc.docDate ? doc.docDate.replace(/(\d{4})\.(\d{1,2})\.(\d{1,2})/, '$1. $2. $3.') : '';
      const deptDocNumber = doc.dept && doc.docNumber ? `${doc.dept}-${doc.docNumber}` : '';
      if (!deptDocNumber || !formattedDate) return;
      if (hasTitles) {
        prompt += `${index > 0 ? '\n      ' : ''}${deptDocNumber}(${formattedDate})${doc.docTitle ? ` "${doc.docTitle}"` : ''}`;
      } else {
        prompt += `${index > 0 ? ', ' : ''}${deptDocNumber}(${formattedDate})`;
      }
    });
  }

  prompt += `\n\n    ${hasRelated ? '2' : '1'}. ${content}`;

  if (hasAttachments) {
    prompt += `\n\n    붙임`;
    attachments.forEach((att, index) => {
      if (!att.attachment) return;
      if (attachments.length > 1) {
        prompt += `\n      ${index + 1}. ${att.attachment} ${att.count}부.`;
      } else {
        prompt += `\n      ${att.attachment} ${att.count}부.  끝.`;
      }
    });
    if (attachments.length > 1) prompt += `  끝.`;
  } else {
    prompt += `  끝.`;
  }

  console.log('프롬프트:', prompt);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    const generatedDoc = response.choices[0].message.content;
    return { statusCode: 200, body: JSON.stringify({ generatedDoc }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: '공문서 생성 중 오류: ' + error.message }) };
  }
};