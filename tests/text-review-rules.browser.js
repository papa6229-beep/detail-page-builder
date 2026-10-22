async (page) => {
  await page.goto('http://127.0.0.1:3000/');
  return await page.evaluate(async () => {
    const { collectReviewFields, parseReviewSuggestions, applyTextSuggestions } = await import('/textReview.ts');
    const { INITIAL_PRODUCT_DATA } = await import('/constants.ts');
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const data = { ...INITIAL_PRODUCT_DATA, productNameKr: '오나홀', mainImage: 'secret-image-data', featureTitle: '__ENABLED__', aiFeatureDesc: '##됬다## 됬다\n10mm 실리콘 오나홀', summaryInfo: { ...INITIAL_PRODUCT_DATA.summaryInfo, weight: '70g' }, options: [{ id: 'keep-id', name: '핑끄', image: null, x: 4, y: 5, width: 80, height: 90 }] };
    const fields = collectReviewFields(data);
    assert(!JSON.stringify(fields).includes('secret-image-data') && !JSON.stringify(fields).includes('__ENABLED__') && fields.some(f => f.id === 'summary.weight') && fields.some(f => f.id === 'option:keep-id'), 'Review must collect every text family and exclude images and placeholders');
    const response = { suggestions: [
      { field: 'aiFeatureDesc', before: '됬다', after: '됐다', occurrence: 1, reason: '오타' },
      { field: 'aiFeatureDesc', before: '됬다', after: '됐다', occurrence: 0, reason: '오타' },
      { field: 'aiFeatureDesc', before: '10mm', after: '20mm', occurrence: 0, reason: 'invalid numeric change' },
      { field: 'aiFeatureDesc', before: '##됬다##', after: '됐다', occurrence: 0, reason: 'invalid marker change' },
      { field: 'mainImage', before: 'secret', after: 'public', occurrence: 0, reason: 'invalid field' },
      { field: 'aiFeatureDesc', before: '없는 원문', after: '수정', occurrence: 0, reason: 'hallucination' },
      { field: 'aiFeatureDesc', before: '됬다', after: '됐다', occurrence: 0, reason: 'duplicate' },
    ] };
    const candidates = parseReviewSuggestions(response, fields);
    assert(candidates.length === 2 && candidates[0].start > candidates[1].start, 'Parser must distinguish repeated words and reject invalid/overlapping candidates');
    const one = applyTextSuggestions(data, [candidates[0]]);
    assert(one.data.aiFeatureDesc === '##됬다## 됐다\n10mm 실리콘 오나홀' && one.data.productNameKr === '오나홀' && one.data.mainImage === data.mainImage, 'Only the selected occurrence may change; terminology, facts, images and formatting must remain');
    const both = applyTextSuggestions(data, candidates);
    assert(both.applied === 2 && both.data.aiFeatureDesc === '##됐다## 됐다\n10mm 실리콘 오나홀', 'Multiple replacements in one field must use original offsets safely');
    const stale = applyTextSuggestions({ ...data, aiFeatureDesc: '사용자가 이미 수정한 문장' }, candidates);
    assert(stale.applied === 0 && stale.skipped === 2 && stale.data.aiFeatureDesc === '사용자가 이미 수정한 문장', 'Stale results must never overwrite newer text');
    const optionCandidates = parseReviewSuggestions({ suggestions: [{ field: 'option:keep-id', before: '핑끄', after: '핑크', occurrence: 0, reason: '오타' }] }, fields);
    const option = applyTextSuggestions(data, optionCandidates);
    assert(option.data.options[0].name === '핑크' && option.data.options[0].id === 'keep-id' && option.data.options[0].x === 4, 'Option correction must preserve identity and layout');
    assert(parseReviewSuggestions({ suggestions: [] }, fields).length === 0, 'Empty review must be valid');
    let invalid = false; try { parseReviewSuggestions({ arbitrary: [] }, fields); } catch { invalid = true; }
    assert(invalid, 'Malformed response must be reported, not presented as no typos');
    return { passed: 8 };
  });
}
