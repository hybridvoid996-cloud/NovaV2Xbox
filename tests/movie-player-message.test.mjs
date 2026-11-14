import test from 'node:test';import assert from 'node:assert/strict';
import {moviePlayerMessage} from '../Public/src/movie-player-message.mjs';
test('native and Scramjet window envelopes deliver only current-frame playback events',()=>{
 const source={},data={token:'current',novaAction:'novaMovieTime',currentTime:42};
 const wrap=value=>({$scramjet$messagetype:'window',$scramjet$origin:'https://provider.example',$scramjet$data:value});
 for(const payload of [data,wrap(data),wrap(wrap(data))])assert.equal(moviePlayerMessage({source,data:payload},source,'current'),data);
 assert.equal(moviePlayerMessage({source:{},data:wrap(data)},source,'current'),null);
 assert.equal(moviePlayerMessage({source,data:wrap(data)},source,'old'),null);
 assert.equal(moviePlayerMessage({source,data:wrap({...data,novaAction:'untrusted'})},source,'current'),null);
 assert.equal(moviePlayerMessage({source,data:{$scramjet$messagetype:'worker',$scramjet$data:data}},source,'current'),null);
});
