import {mountMovieWallpaper} from './movie-wallpaper.mjs';
mountMovieWallpaper();
const tools=document.querySelector('#composer .tools');
const controls=document.createElement('div');controls.className='composer-model-controls';
for(const id of ['share-screen','ai-model','answer-mode']){const control=document.getElementById(id);if(control)controls.append(control)}
tools.insertBefore(controls,document.getElementById('send'));
const heading=document.querySelector('#welcome h1');
heading.textContent='Welcome to Nova.';
const logo=document.querySelector('#welcome .welcome-orbit');
heading.prepend(logo);
const sync=()=>document.body.classList.toggle('ai-empty',!document.querySelector('#messages .message'));
new MutationObserver(sync).observe(document.getElementById('messages'),{childList:true});sync();
