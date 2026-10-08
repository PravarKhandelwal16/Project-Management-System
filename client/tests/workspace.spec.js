import {test,expect} from '@playwright/test';
import {mockApi} from './fixtures';
test('major pages render at responsive widths without document overflow or runtime errors',async({page},testInfo)=>{
  await mockApi(page);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let width;
  for(const path of ['/dashboard','/projects','/projects/1','/tasks','/tasks/1','/calendar','/analytics','/team','/admin/users','/admin/audit-logs','/notifications','/settings']){
    await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();await expect(page.locator('.workspace-skeleton')).toHaveCount(0);
    const measured=await page.locator('.workspace-page').evaluate(element=>element.getBoundingClientRect().width);
    width??=measured;expect(Math.abs(width-measured)).toBeLessThan(2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(path.replaceAll('/','_')+'.png')});
  }
  if(testInfo.project.name!=='desktop'){await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.locator('.sidebar')).toHaveClass(/open/);await page.getByRole('button',{name:'Close navigation'}).click();}
  expect(errors).toEqual([]);
});
test('login/register forms render and label their controls',async({page})=>{
  await page.goto('/login');await expect(page.getByLabel('Email Address')).toBeVisible();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
  await page.goto('/register');await expect(page.locator('input[name="fullName"]')).toBeVisible();
  await page.getByLabel('Full Name').fill('Person');await page.getByLabel('Email Address').fill('test@example.invalid');await page.getByLabel('Password',{exact:true}).fill('abcdefgh');await page.getByLabel('Confirm Password').fill('abcdefgh');await page.getByRole('button',{name:'Create Account'}).click();await expect(page.getByText('Password must contain a letter and a number',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
test('deletion confirmation cancels without a request and keyboard confirmation deletes once',async({page})=>{
  await mockApi(page);let deletes=0;
  await page.route('**/api/tasks/1',async route=>{if(route.request().method()==='DELETE'){deletes++;await route.fulfill({json:{success:true}});}else await route.fallback();});
  await page.goto('/tasks/1');await page.getByRole('button',{name:'Delete task',exact:true}).click();
  const dialog=page.getByRole('alertdialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);expect(deletes).toBe(0);
  await page.getByRole('button',{name:'Delete task',exact:true}).click();await dialog.getByRole('button',{name:'Delete task',exact:true}).click();await expect(page).toHaveURL(/\/tasks$/);expect(deletes).toBe(1);
});
test('calendar whitespace selects a date and task labels appear below dates',async({page})=>{
  await mockApi(page);await page.goto('/calendar');await expect(page.locator('.calendar-event').first()).toBeVisible();
  const day=page.locator('.calendar-day').nth(10),button=day.locator('.calendar-day-select');
  await button.click({position:{x:10,y:70}});await expect(day).toHaveClass(/selected/);
  await expect(page.getByRole('button',{name:'Colours',exact:true})).toBeVisible();
  const positions=await page.locator('.calendar-day:has(.calendar-event)').first().evaluate(el=>({date:el.querySelector('.calendar-day-number').getBoundingClientRect().bottom,event:el.querySelector('.calendar-event').getBoundingClientRect().top}));expect(positions.event).toBeGreaterThanOrEqual(positions.date);
});
test('network/API errors have retry states and unauthorized sessions leave protected pages',async({page})=>{
  await mockApi(page);
  for(const [status,message] of [[500,'Internal server error'],[403,'You do not have permission'],[404,'Resource not found']]){
    await page.route('**/api/projects',route=>route.fulfill({status,json:{success:false,message}}));
    await page.goto('/projects');await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();await expect(page.getByText(message,{exact:true})).toBeVisible();
  }
  await page.route('**/api/notifications/preferences',route=>route.abort('failed'));
  await page.goto('/settings');await expect(page.getByText('Could not load settings',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
  await page.route('**/api/tasks',route=>route.fulfill({status:401,json:{success:false,message:'Token expired'}}));
  await page.goto('/tasks');await expect(page).toHaveURL(/\/login$/);
});
