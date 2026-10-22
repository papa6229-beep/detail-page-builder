async (page) => {
  const probe = await page.context().newPage();
  try {
    await probe.goto('http://127.0.0.1:3001/image-lab.html');
    return await probe.evaluate(async () => {
      const { finishImage } = await import('/lab/finishImage.ts');
      const { DEFAULT_SHADOW } = await import('/lab/shadow.ts');
      const c = new OffscreenCanvas(640, 320), ctx = c.getContext('2d');
      // Transparent horizontal body, with a taller opaque base touching the floor.
      ctx.fillStyle = 'rgba(160,150,150,.3)'; ctx.fillRect(90, 170, 350, 55);
      ctx.fillStyle = '#8b5143'; ctx.fillRect(440, 90, 75, 160);
      const source = ctx.getImageData(0, 0, 640, 320).data;
      const input = await c.convertToBlob();
      const read = async settings => {
        const image = await createImageBitmap(await finishImage(input, 0, settings));
        ctx.clearRect(0, 0, 640, 320); ctx.drawImage(image, 0, 0); image.close();
        return ctx.getImageData(0, 0, 640, 320).data;
      };
      const result = await read(DEFAULT_SHADOW);
      const peak = (l,t,r,b) => {
        let max = 0;
        for(let y=t;y<b;y++) for(let x=l;x<r;x++) max=Math.max(max,result[(y*640+x)*4+3]);
        return max;
      };
      const contact=peak(130,225,390,231), haze=peak(130,237,390,243), base=peak(455,250,500,256);
      if(contact < 35) throw new Error(`Transparent body loses its contact shadow: ${contact}/255 (minimum 35)`);
      if(contact <= haze) throw new Error('Contact must be tighter and stronger than the surrounding haze');
      if(base > 130) throw new Error(`Opaque base was over-darkened: ${base}/255`);
      for(let i=0;i<source.length;i+=4) if(source[i+3]===255 && [0,1,2,3].some(k=>source[i+k]!==result[i+k])) throw new Error('Opaque product pixels changed');
      const disabled=await read({...DEFAULT_SHADOW,enabled:false});
      for(let i=3;i<source.length;i+=4) if(source[i]===0 && disabled[i]!==0) throw new Error('Disabled shadow still renders');
      return {passed:5,contact,haze,base};
    });
  } finally { await probe.close(); }
}
