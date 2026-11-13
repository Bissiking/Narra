import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timelineLayout,timelineClip} from '../src/lib/studio-timeline';

test('a thirteen-minute scene opens at a readable scale on desktop and mobile',()=>{
 for(const available of [172,1160,1780]){
  const layout=timelineLayout(803,available,1);
  assert.ok(timelineClip(0,3,layout.scale).width>=180);
  assert.ok(layout.width>available);
  assert.ok(layout.tick*layout.scale>=96);
 }
});
test('fitting the whole scene does not expand clips beyond their time slots',()=>{
 for(const available of [1,172,1160]){
  const layout=timelineLayout(803,available,'fit');
  assert.ok(Math.abs(layout.width-available)<.001);
  const clips=Array.from({length:267},(_,i)=>timelineClip(i*3,3,layout.scale));
  for(let i=0;i<clips.length-1;i++)assert.ok(clips[i].left+clips[i].width<=clips[i+1].left);
  assert.ok(layout.tick*layout.scale>=96);
 }
});
test('ruler density follows the visible scale instead of using fixed ten-second labels',()=>{
 const overview=timelineLayout(803,1160,'fit');
 const working=timelineLayout(803,1160,1);
 const enlarged=timelineLayout(803,1160,3);
 assert.ok(overview.tick>working.tick);
 assert.ok(enlarged.tick<=working.tick);
 for(const layout of [overview,working,enlarged])assert.ok(layout.tick*layout.scale>=96);
});
test('short scenes, empty scenes and zoom extremes keep a finite usable canvas',()=>{
 for(const duration of [0,3,20,36000])for(const zoom of [.5,1,3,'fit'] as const){
  const layout=timelineLayout(duration,320,zoom);
  assert.ok(Number.isFinite(layout.width)&&layout.width>=320-.001);
  assert.ok(layout.tick>0&&layout.scale>0);
  const clip=timelineClip(12,3,layout.scale);
  assert.ok(clip.width>=0&&clip.width<=3*layout.scale);
 }
});
