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
  const contentLines = content.split('\n');
  const firstLine = contentLines[0];

  let prompt = `
    다음 규칙을 엄격히 준수하여 공문을 작성하세요:
    - 공문 헤더(학교명, 주소, 수신 등)는 추가하지 말고, 입력값(관련, 본문, 붙임)만 사용해 작성.
    - 항목 기호: "1., 가., 1), 가), (1), (가), ①, ㉮" 순으로 사용, 특수 기호(□, ○, -, ∙) 제외.
    - 표시 위치: 첫째 항목은 왼쪽 처음부터 시작, 둘째부터는 상위 항목에서 공백 2칸 들여쓰기, 기호와 내용 사이는 공백 1칸, 여러 줄은 내용 첫 글자에 정렬, 단일 항목은 기호 없음.
    - 단락: 본문 단락 사이는 한 줄 띄우기, 본문과 붙임 사이도 한 줄 띄움.
    - 날짜: "2025. 3. 14." 형식(공백 포함), 입력값에 공백 추가, 요일(예: (목)) 추가 가능.
    - 관련: "1. 관련: 부서명-문서번호(날짜) \\"제목\\"" 형식, 여러 개일 경우 제목 있으면 개행 후 칸 맞춤, 제목 없으면 ", "로 연결, 제목은 선택 사항, 관련 문서가 없으면 '1. 관련:' 항목 자체 생략하고 본문이 1번부터 시작.
    - 한자어: 이해 어려운 한자어 사용 금지.
    - 시간: 24시간제, 쌍점 사용(예: 14:30), 범위는 '-'로 연결(예: 10:00-10:50).
    - 본문: 각 단락 첫 줄은 '1.', '2.' 등의 번호를 붙이고 시작, 첫 줄은 "${firstLine}"를 기반으로 입력값 의도(요청/안내/보고 등)에 따라 공문 관례에 맞게 보완, 요청 의도(예: "하고자" 포함)면 "~를 다음과 같이 [동사]하고자 합니다", 안내 의도(예: "안내" 포함, 하위 항목 있음)면 "~를 다음과 같이 안내합니다", 보고 의도(예: "보고" 포함)면 "~를 보고합니다", 그 외는 입력값 의미에 따라 "~를 [동사]합니다"로 보완, "구입합니다" 등 직설적 표현 피하고 관례적 표현 우선, 불필요한 단어 추가 최소화, 하위 항목은 첫 줄 의도와 맥락적으로 맞는 경우에만 입력값을 토대로 공백 2칸 들여쓰기 후 "가. ", "나. " 등으로 항목화(예: "구입"이면 "구입 품목", "예산" 등, "안내"이면 "일시", "장소" 등), 첫 줄과 하위 항목이 어울리지 않으면 항목화 강제하지 않음, 각 항목 사이 한 줄 띄움 필수, 하위 항목은 "입니다" 없이 "항목: 내용" 형식.
    - 금액: 아라비아 숫자로 표기하되, 숫자 뒤 괄호를 사용해 한글로 기재(예: "113,560원 (금일십일만삼천오백육십원)").
    - 붙임: "붙임"은 한 번만 앞에 쓰고, 여러 개일 경우 "1. OOO N부."로 번호 붙여 개행, 마지막 항목 뒤 공백 2칸 후 "끝.", 하나면 "붙임  OOO N부.  끝.", 붙임이 없으면 '붙임' 단어와 관련 내용 모두 생략.
    - 문서 끝: 본문 마지막 문장 뒤 공백 2칸 후 "끝."을 동일 줄에 추가, 붙임이 있으면 붙임 마지막 항목 뒤에 적용.
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
    prompt += '\n';
  }

  prompt += `\n    ${hasRelated ? '2' : '1'}. ${firstLine}`;
  if (contentLines.length > 1) {
    prompt += contentLines.slice(1).map(line => `  ${line}`).join('\n\n  ');
  }
  if (!hasAttachments) {
    prompt += '  끝.';
  }

  if (hasAttachments) {
    prompt += `\n\n    붙임`;
    attachments.forEach((att, index) => {
      if (!att.attachment) return;
      prompt += `\n      ${index + 1}. ${att.attachment} ${att.count}부.${index === attachments.length - 1 ? '  끝.' : ''}`;
    });
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