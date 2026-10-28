import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recentArtwork,recentArtworkCandidates,setRecentMusicCover} from '../Public/src/recent-artwork.mjs';
import {song} from '../Public/src/music-core.mjs';
test('retains provider artwork routes and repairs older double wrappers',()=>{
 for(const op of ['void-art','noah-art','import-art','asset']){
  const art='/api/soundcloud?op='+op+'&token=abc';
  assert.equal(recentArtwork(art),art);
  assert.equal(recentArtwork('/api/soundcloud?op=asset&url='+encodeURIComponent(art)),art);
  assert.equal(song({id:'void:12',title:'Song',thumb:art}).thumb,art);
 }
});
test('routes movie artwork through Nova and retains alternate pictures',()=>{
 const poster='https://image.tmdb.org/t/p/w780/poster.jpg';
 assert.equal(recentArtwork(poster,'movie'),'/api/movies?op=image&url='+encodeURIComponent(poster));
 assert.equal(recentArtworkCandidates({art:poster,poster,backdrop:'https://s4.anilist.co/file/cover.jpg'},'movie').length,2);
});
test('uses the correct cover endpoint and rejects unsafe URLs',()=>{
 assert.match(recentArtwork('https://resources.tidal.com/images/abc.jpg'),/op=noah-art/);
 assert.match(recentArtwork('https://i.scdn.co/image/abc'),/op=import-art/);
 for(const value of ['javascript:alert(1)','//bad.example/a','/owner.html','data:text/html,hi'])assert.equal(recentArtwork(value),'');
});
test('player tries alternate covers, updates same-song artwork, and avoids restarting failed covers each tick',()=>{
 const img={dataset:{},src:''};
 const track={thumb:'/api/soundcloud?op=void-art&token=abc',thumbs:['https://i.scdn.co/image/xyz']};
 setRecentMusicCover(img,track);
 assert.equal(img.src,track.thumb);
 img.onerror();assert.match(img.src,/op=import-art/);
 const alternate=img.src;setRecentMusicCover(img,track);assert.equal(img.src,alternate);
 setRecentMusicCover(img,{...track,thumb:'https://resources.tidal.com/updated.jpg'});assert.match(img.src,/op=noah-art/);
});
