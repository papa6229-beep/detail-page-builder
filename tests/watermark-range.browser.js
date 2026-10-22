async(page) => {
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1050}});
  await context.addInitScript(()=>sessionStorage.setItem('builder_editor_open','1'));
  const p=await context.newPage();p.setDefaultTimeout(8000);
  try {
    await p.goto('http://127.0.0.1:3000/');
    const saved=()=>p.getByRole('status',{name:'자동 저장 상태',exact:true}).filter({hasText:'저장됨'}).waitFor();await saved();
    const assert=(v,m)=>{if(!v)throw new Error(m)};
    const fixture=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=1000;const x=c.getContext('2d');x.fillStyle='#eeeeee';x.fillRect(0,0,800,1000);return c.toDataURL().split(',')[1]});
    const logo=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const x=c.getContext('2d');x.fillStyle='#3271a4';x.fillRect(10,10,80,80);return c.toDataURL().split(',')[1]});
    for(const [label,buffer] of [['Main Image',fixture],['워터마크',logo]])await p.getByRole('group',{name:`${label} 이미지 첨부`,exact:true}).locator('input[type=file]').setInputFiles({name:'range.png',mimeType:'image/png',buffer:Buffer.from(buffer,'base64')});
    await p.getByRole('group',{name:'Main Image 이미지 첨부',exact:true}).getByRole('button',{name:'워터마크 OFF',exact:true}).click();
    const move=p.getByRole('button',{name:'메인 워터마크 이동',exact:true}),image=p.locator('#preview-main img[alt="watermark"]');
    await move.scrollIntoViewIfNeeded();const b=await move.boundingBox();
    await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2+600,b.y+b.height/2+450,{steps:10});await p.mouse.up();
    assert(Math.abs(Number(await image.getAttribute('data-image-x'))-600)<2&&Math.abs(Number(await image.getAttribute('data-image-y'))-450)<2,'Small watermark must travel beyond three times its own size');
    await p.getByRole('button',{name:'되돌리기',exact:true}).click();assert(await image.getAttribute('data-image-x')==='0','Long watermark drag must undo in one step');
    await p.getByRole('button',{name:'다시 실행',exact:true}).click();
    await move.click();
    await p.getByRole('button',{name:'메인 워터마크 회전',exact:true}).focus();await p.keyboard.press('ArrowRight');
    assert(await image.getAttribute('data-image-x')==='600'&&await image.getAttribute('data-image-angle')==='1','Rotation must preserve the extended position');
    await saved();const relative=await image.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('#preview-main').getBoundingClientRect();return{x:a.x-b.x,y:a.y-b.y}});
    await p.reload();await saved();const restored=await image.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('#preview-main').getBoundingClientRect();return{x:a.x-b.x,y:a.y-b.y}});
    assert(Math.abs(relative.x-restored.x)<2&&Math.abs(relative.y-restored.y)<2&&await image.getAttribute('data-image-x')==='600','Extended watermark placement must survive reload without a position jump');
    await move.click();await p.getByRole('button',{name:'메인 워터마크 배치 초기화',exact:true}).click();assert(await image.getAttribute('data-image-x')==='0','Reset must recover a watermark after an extended move');
    assert(await p.locator('#preview-main img[alt="Main"]').getAttribute('src')===`data:image/png;base64,${fixture}`,'Moving the watermark must preserve the product source');
    return{passed:6,relative,restored};
  } finally {await context.close()}
}
