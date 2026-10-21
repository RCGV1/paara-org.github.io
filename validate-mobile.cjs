const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.BASE_URL||'http://localhost:4000';
const out=__dirname;
const results=[];let checks=0;
function check(value,message){assert.ok(value,message);checks++}
async function closed(p){await p.waitForFunction(()=>!document.querySelector('dialog').open&&!document.documentElement.classList.contains('navigation-open'))}
async function open(p){await p.locator('#navigation-open').click();await p.waitForFunction(()=>document.querySelector('dialog').open);await p.waitForTimeout(200)}
async function shot(p,name){await p.evaluate(()=>scrollTo(0,0));await p.mouse.move(389,840);await p.screenshot({path:path.join(out,name+'.png')})}
(async()=>{
 for(const[name,type]of[['Chromium',chromium],['WebKit',webkit]]){
  const b=await type.launch(name==='Chromium'?{channel:'chrome'}:{});
  for(const width of[320,360,390,430,600,767,768,1024,1280]){
   const mobile=width<768;
   const c=await b.newContext({viewport:{width,height:844},isMobile:mobile,hasTouch:mobile});
   const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base,{waitUntil:'load'});
   check(await p.locator('.site-navigation a').count()===21,'all 21 links preserved');
   check(!await p.locator('dialog').evaluate(e=>e.open),'drawer initially closed');
   check(await p.locator('#navigation-open').isVisible()===mobile,'responsive menu visibility');
   if(mobile){
    check(await p.locator('.site-navigation').evaluate(e=>e.closest('dialog')!==null),'single nav moved into drawer');
    const toolbar=await p.locator('.mobile-navigation-bar').boundingBox();
    const menu=await p.locator('#navigation-open').boundingBox();
    const toggle=await p.locator('.theme-toggle').boundingBox();
    check(menu.height>=44&&menu.width>=44&&toggle.height>=44&&toggle.width>=44,'44px controls');
    check(toggle.x>=menu.x+menu.width,'toolbar no overlap');
    check((await p.locator('#main-content').boundingBox()).y<300,'first-screen content');
    check(await p.locator('#sidebar').isVisible()===false,'no duplicate sidebar');
    await p.locator('#navigation-open').focus();await p.keyboard.press('Enter');await p.waitForTimeout(200);
    check(await p.locator('dialog').evaluate(e=>e.open),'keyboard opens drawer');
    check(await p.locator('#navigation-open').getAttribute('aria-expanded')==='true','expanded state');
    check(await p.locator('.drawer-close').evaluate(e=>e===document.activeElement),'focus moves to close button');
    const rect=await p.locator('dialog').boundingBox();
    check(Math.abs(rect.x)<1&&Math.abs(rect.y)<1&&rect.width<width&&Math.abs(rect.height-844)<1,'left full-height drawer and backdrop');
    for(const link of await p.locator('.site-navigation a').all()){
     const box=await link.boundingBox();check(box.width>=44&&box.height>=44,'44px navigation links');
     check(box.x>=0&&box.x+box.width<=rect.width+1,'single-column links fit panel');
    }
    await p.locator('.theme-toggle').evaluate(e=>e.focus());
    check(await p.locator('dialog').evaluate(e=>e.contains(document.activeElement)),'background cannot receive focus');
    for(let i=0;i<25;i++){
     await p.keyboard.press(name==='WebKit'?'Alt+Tab':'Tab');
     check(await p.locator('dialog').evaluate(e=>e.contains(document.activeElement)),'focus stays in modal');
    }
    const header=await p.locator('.drawer-heading').boundingBox();
    await p.locator('.site-navigation a').last().scrollIntoViewIfNeeded();
    check(await p.locator('.drawer-links').evaluate(e=>e.scrollTop)>0,'drawer independently scrolls to last link');
    check(Math.abs((await p.locator('.drawer-heading').boundingBox()).y-header.y)<1,'close button remains accessible');
    const scroll=await p.evaluate(()=>scrollY);await p.mouse.move(width-5,500);if(name==='Chromium')await p.mouse.wheel(0,500);
    else check(await p.evaluate(()=>getComputedStyle(document.documentElement).overflow==='hidden'&&getComputedStyle(document.body).overflow==='hidden'),'WebKit background scroll styles locked');
    check(await p.evaluate(()=>scrollY)===scroll,'background scroll locked');
    await p.keyboard.press('Escape');await closed(p);
    check(await p.locator('#navigation-open').evaluate(e=>e===document.activeElement),'Escape restores opener focus');
    check(await p.locator('#navigation-open').getAttribute('aria-expanded')==='false','collapsed state');
    await open(p);await p.locator('.drawer-close').click();await closed(p);
    await open(p);await p.mouse.click(width-5,200);await closed(p);
    await open(p);
    await p.locator('.site-navigation a[href="/setup-guides/"]').click();await p.waitForURL('**/setup-guides/');await p.waitForLoadState('load');
    check(await p.locator('.site-navigation a[href="/setup-guides/"]').getAttribute('aria-current')==='page','page navigation and active section');
    check(!await p.locator('dialog').evaluate(e=>e.open),'new page starts closed');
    await p.locator('.theme-toggle').click();check(await p.locator('html').getAttribute('data-theme')==='dark','theme toggle');
    await p.reload();check(await p.locator('html').getAttribute('data-theme')==='dark','theme persists');
    await open(p);await p.setViewportSize({width:1024,height:844});await closed(p);
    check(await p.locator('.site-navigation').evaluate(e=>e.parentElement.id==='sidebar'),'desktop reuses nav');
    check(await p.locator('.site-navigation a').last().isVisible(),'desktop links restored');
    check(await p.locator('.theme-toggle').evaluate(e=>e.parentElement===document.body),'desktop theme placement');
    await p.setViewportSize({width,height:844});await p.waitForFunction(()=>document.querySelector('.site-navigation').closest('dialog'));
    check(!await p.locator('dialog').evaluate(e=>e.open),'return to mobile starts closed');
   }else{
    check(await p.locator('.site-navigation').evaluate(e=>e.parentElement.id==='sidebar'),'desktop nav location');
    check(await p.locator('.site-navigation a').last().isVisible(),'desktop links visible');
    check(await p.locator('.theme-toggle').evaluate(e=>e.parentElement===document.body),'original desktop theme placement');
   }
   check(errors.length===0,`no script errors ${errors}`);
   results.push(`${name}: ${width}px passed`);console.log(results.at(-1));await c.close();
  }
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await p.goto(base);
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const theme of['light','dark']){
   if(theme==='dark')await p.locator('.theme-toggle').click();
   const toolbarAudit=await p.evaluate(async()=>(await axe.run({include:['.mobile-navigation-bar']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
   check(toolbarAudit.length===0,`${name} ${theme} toolbar axe ${JSON.stringify(toolbarAudit)}`);
   await shot(p,`${name.toLowerCase()}-mobile-${theme}`);await open(p);
   const audit=await p.evaluate(async()=>(await axe.run({include:['#mobile-navigation']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
   check(audit.length===0,`${name} ${theme} drawer axe ${JSON.stringify(audit)}`);
   await p.locator('.drawer-links').evaluate(e=>e.scrollTop=0);await shot(p,`${name.toLowerCase()}-menu-${theme}`);
   await p.locator('.drawer-close').click();await closed(p);
  }
  await p.locator('.theme-toggle').click();await p.setViewportSize({width:1280,height:900});await shot(p,`${name.toLowerCase()}-desktop-after`);
  await p.setViewportSize({width:320,height:600});await p.addStyleTag({content:'#navigation-open{font-size:30px}.mobile-theme-controls{font-size:28px}.mobile-drawer a.sidebar{font-size:32px}'});
  const menub=await p.locator('#navigation-open').boundingBox();const themeb=await p.locator('.mobile-theme-controls').boundingBox();
  check(menub.x+menub.width<=themeb.x,'200% toolbar text fits');await open(p);
  check(await p.locator('.drawer-links').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'200% drawer text fits');
  await p.locator('.site-navigation a').last().scrollIntoViewIfNeeded();check(await p.locator('.site-navigation a').last().isVisible(),'last link reachable at enlarged text');
  await p.locator('.drawer-close').click();await closed(p);
  await p.emulateMedia({reducedMotion:'reduce'});await open(p);check(await p.locator('dialog').evaluate(e=>getComputedStyle(e).animationName)==='none','reduced motion');
  await p.locator('.drawer-close').click();await closed(p);await p.setViewportSize({width:740,height:320});await open(p);
  await p.locator('.site-navigation a').last().scrollIntoViewIfNeeded();check((await p.locator('.drawer-close').boundingBox()).y>=0,'short landscape retains close control');await p.close();
  const nojs=await b.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.goto(base);
  check(await nojs.locator('#sidebar a').count()===21&&await nojs.locator('#sidebar a').last().isVisible(),'no JS navigation fallback');await nojs.close();
  const blocked=await b.newPage({viewport:{width:390,height:844}});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Blocked')}}));await blocked.goto(base);await blocked.locator('.theme-toggle').click();check(await blocked.locator('html').getAttribute('data-theme')==='dark','storage blocked fallback');await blocked.close();
  await b.close();
 }
 const report={status:'passed',checks,results};fs.writeFileSync(path.join(out,'validation-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
