const { OpenAI } = require('openai');

exports.handler = async (event) => {
  console.log('받은 이벤트:', event);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    console.log('event.body 파싱 오류:', e.message);
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청 데이터' }) };
  }

  const { deptDocNumber, docTitle, docDate, content, attachment, attachmentCount } = body;
  console.log('입력값:', { deptDocNumber, docTitle, docDate, content, attachment, attachmentCount });

  if (!content) {
    console.log('필수 항목 누락');
    return { statusCode: 400, body: JSON.stringify({ error: '필수 항목(본문)이 누락되었습니다.' }) };
  }

  const hasRelated = deptDocNumber && docTitle && docDate;
  const hasAttachment = attachment;
  const count = attachmentCount || '1';
  const contentLines = content.split('\n');
  const firstLine = contentLines[0];

  let prompt = `
    다음 규칙을 엄격히 준수하여 공문을 작성하세요:
    - 공문 헤더(학교명, 주소, 수신 등)는 추가하지 말고, 입력값(관련, 본문, 붙임)만 사용해 작성.
    - 항목 기호: "1., 가., 1), 가), (1), (가), ①, ㉮" 순으로 사용, 특수 기호(□, ○, -, ∙) 제외.
    - 표시 위치: 첫째 항목은 왼쪽 처음부터 시작, 둘째부터는 상위 항목에서 공백 2칸 들여쓰기, 기호와 내용 사이는 공백 1칸, 여러 줄은 내용 첫 글자에 정렬, 단일 항목은 기호 없음.
    - 단락: 본문 단락 사이는 한 줄 띄우기, 본문과 붙임 사이도 한 줄 띄움.
    - 날짜: "2025. 3. 14." 형식(공백 포함), 입력값에 공백 추가.
    - 관련: "1. 관련: 부서명-문서번호(날짜) \\"제목\\"" 형식으로 한 줄에, 있으면 1번부터 시작.
    - 한자어: 이해 어려운 한자어 사용 금지.
    - 시간: 24시간제, 쌍점 사용(예: 14:30), 범위는 '-'로 연결(예: 10:00-10:50).
    - 본문: 첫 줄은 "${firstLine}을 다음과 같이 실시합니다"로 작성, 내용에 따라 "실시합니다", "안내합니다" 등 적절히 조정, 하위 항목은 "입니다" 없이 "장소: ", "시간: "처럼 ":" 또는 "-"로 간결히.
    - 붙임: 입력 시 본문 후 한 줄 띄우고, 하나면 "붙임  OOO N부.", 여러 개면 "붙임  1. OOO N부." 형식, N은 부수(기본값 1).
    - 문서 끝: 마지막 항목 끝에 공백 2칸 후 "끝." 추가.
    - 물결표/붙임표: 앞뒤 붙임(예: 물결표~, 붙임표-).
    - 금액: 아라비아 숫자+한글 괄호(예: 금113,560원(금일십일만삼천오백육십원)).
    - 표기: 한국어 표준 표기법 준수.
    
    아래 입력값을 사용해 공문을 작성:
  `;

  const formattedDate = docDate ? docDate.replace(/(\d{4})\.(\d{1,2})\.(\d{1,2})/, '$1. $2. $3.') : '';

  if (hasRelated) {
    prompt += `
      1. 관련: ${deptDocNumber}(${formattedDate}) "${docTitle}"
    `;
  }

  prompt += `
    ${hasRelated ? '2' : '1'}. ${firstLine}을 다음과 같이 실시합니다
  `;
  prompt += contentLines.slice(1).map(line => `  ${line}`).join('\n');

  if (hasAttachment) {
    const attachmentLines = attachment.split('\n');
    if (attachmentLines.length > 1) {
      prompt += `
      
      붙임
      `;
      attachmentLines.forEach((line, index) => {
        prompt += `
        ${index + 1}. ${line} ${count}부.
        `;
      });
    } else {
      prompt += `
      
      붙임  ${attachment} ${count}부.  끝.
      `;
    }
  } else {
    prompt += `  끝.`;
  }

  console.log('프롬프트:', prompt);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    console.log('OpenAI 응답:', response);
    const generatedDoc = response.choices[0].message.content;
    return { statusCode: 200, body: JSON.stringify({ generatedDoc }) };
  } catch (error) {
    console.log('OpenAI 오류:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: '공문서 생성 중 오류: ' + error.message }) };
  }
};