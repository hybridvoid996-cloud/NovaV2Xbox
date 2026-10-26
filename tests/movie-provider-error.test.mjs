import test from 'node:test';
import assert from 'node:assert/strict';
import {isMovieProviderError} from '../Public/src/movie-provider-error.mjs';
test('recognizes provider deployment and soft 404 pages',()=>{
 for(const text of ['404: NOT_FOUND Code: DEPLOYMENT_NOT_FOUND','404 This page could not be found.','This deployment could not be found. Vercel','404 This page does not exist'])assert.equal(isMovieProviderError(text),true,text);
});
test('ordinary titles, descriptions and missing optional resources are not player failures',()=>{
 for(const text of ['404','Buddy','Page not found in the diary of a missing person','Failed to load comments','No subtitles found','The available players','Vercel'])assert.equal(isMovieProviderError(text),false,text);
});
