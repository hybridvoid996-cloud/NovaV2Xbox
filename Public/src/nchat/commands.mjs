// Slash commands: a searchable palette plus the command runner.
// Moderator/owner commands from the previous chat still run through runCommand().
import {state,el,h,icon,isStaff,isOwner,person,sheet,toast} from './core.mjs';
import {runCommand} from '../chat-profile-redesign.js?v=20261029-name-sync394';
import {pollText} from './messages.mjs';

const BALL=['It is certain.','Without a doubt.','Yes, definitely.','You may rely on it.','Most likely.','Outlook good.','Signs point to yes.','Reply hazy, try again.','Ask again later.','Cannot predict now.','Don\'t count on it.','My reply is no.','Outlook not so good.','Very doubtful.'];
export function commandList(){
 const all=[
  {cmd:'/help',args:'',desc:'See every command',group:'Everyone',icon:'slash'},
  {cmd:'/poll',args:'question | option | option',desc:'Start a poll people can vote on',group:'Everyone',icon:'poll'},
  {cmd:'/me',args:'action',desc:'Say something in third person',group:'Everyone',icon:'chat'},
  {cmd:'/spoiler',args:'text',desc:'Hide text until someone clicks it',group:'Everyone',icon:'spoiler'},
  {cmd:'/shrug',args:'[text]',desc:'Add ¯\\_(ツ)_/¯',group:'Fun',icon:'smile'},
  {cmd:'/tableflip',args:'[text]',desc:'(╯°□°)╯︵ ┻━┻',group:'Fun',icon:'smile'},
  {cmd:'/unflip',args:'[text]',desc:'┬─┬ノ( º _ ºノ)',group:'Fun',icon:'smile'},
  {cmd:'/lenny',args:'[text]',desc:'( ͡° ͜ʖ ͡°)',group:'Fun',icon:'smile'},
  {cmd:'/roll',args:'[sides]',desc:'Roll a die (default 6)',group:'Fun',icon:'game'},
  {cmd:'/flip',args:'',desc:'Flip a coin',group:'Fun',icon:'sparkle'},
  {cmd:'/8ball',args:'question',desc:'Ask the magic 8-ball',group:'Fun',icon:'sparkle'},
  {cmd:'/profile',args:'@user',desc:'Open someone\'s profile',group:'Everyone',icon:'users'},
  {cmd:'/dm',args:'@user',desc:'Message a friend',group:'Everyone',icon:'chat'},
  {cmd:'/friend',args:'@user',desc:'Send a friend request',group:'Everyone',icon:'friend'},
  {cmd:'/clear',args:'',desc:'Clear this conversation from your screen',group:'Everyone',icon:'trash'},
  {cmd:'/gift nitro',args:'"username"',desc:'Gift Nitro to someone',group:'Everyone',icon:'nitro'}
 ];
 if(isStaff())all.push(
  {cmd:'/mute',args:'"username" minutes',desc:'Mute a user',group:'Moderation',icon:'shield'},
  {cmd:'/unmute',args:'"username"',desc:'Unmute a user',group:'Moderation',icon:'shield'},
  {cmd:'/ban chat',args:'"username"',desc:'Ban from chat',group:'Moderation',icon:'shield'},
  {cmd:'/unban chat',args:'"username"',desc:'Unban from chat',group:'Moderation',icon:'shield'},
  {cmd:'/status',args:'"username"',desc:'Check moderation status',group:'Moderation',icon:'shield'});
 if(isOwner())all.push(
  {cmd:'/announce',args:'message',desc:'Post to #announcements',group:'Owner',icon:'megaphone'},
  {cmd:'/resetchat',args:'',desc:'Clear public channel history (keeps owner channels, reports, DMs)',group:'Owner',icon:'trash'},
  {cmd:'/give coins',args:'"username" amount',desc:'Give Nova Coins',group:'Owner',icon:'crown'},
  {cmd:'/give xp',args:'"username" amount',desc:'Give XP',group:'Owner',icon:'crown'},
  {cmd:'/give levels',args:'"username" amount',desc:'Give levels',group:'Owner',icon:'crown'},
  {cmd:'/give rank',args:'"username" rank',desc:'Set a Nova rank',group:'Owner',icon:'crown'},
  {cmd:'/give all',args:'"username"',desc:'Unlock every cosmetic',group:'Owner',icon:'crown'},
  {cmd:'/badge nitro',args:'1–8 "username"',desc:'Grant a Nitro badge tier',group:'Owner',icon:'crown'},
  {cmd:'/badge gift',args:'1–20 "username"',desc:'Grant a gifting badge tier',group:'Owner',icon:'crown'},
  {cmd:'/badge reset',args:'"username"',desc:'Clear granted badges',group:'Owner',icon:'crown'},
  {cmd:'/ban nova',args:'"username"',desc:'Ban from all of Nova',group:'Owner',icon:'shield'},
  {cmd:'/unban nova',args:'"username"',desc:'Restore Nova access',group:'Owner',icon:'shield'});
 return all;
}
export function findUser(arg){
 const raw=String(arg||'').trim().replace(/^"|"$/g,'').replace(/^@<|>$/g,'').replace(/^@/,'').toLowerCase();if(!raw)return null;
 if(state.profiles[raw])return raw;
 return Object.keys(state.profiles).find(id=>(state.profiles[id].name||'').toLowerCase()===raw)||null;
}
export function showHelp(){
 const d=sheet('Commands',{cls:'nc-help'}),groups={};for(const c of commandList())(groups[c.group]||=[]).push(c);
 for(const [g,list]of Object.entries(groups)){d.body.append(el('h3','nc-help-group',g));const grid=el('div','nc-help-grid');for(const c of list)grid.append(h('div',{class:'nc-help-item'},icon(c.icon),h('div',{},h('b',{},c.cmd+' ',el('span','',c.args)),el('small','',c.desc))));d.body.append(grid)}
}
/** Runs a slash command. Returns {send:text} when a message should be posted, otherwise null. */
export async function runSlash(text,ctx){
 const [head,...rest]=text.trim().split(/\s+/);const cmd=head.toLowerCase(),arg=rest.join(' ');
 switch(cmd){
  case '/help':showHelp();return null;
  case '/shrug':return {send:(arg?arg+' ':'')+'¯\\_(ツ)_/¯'};
  case '/tableflip':return {send:(arg?arg+' ':'')+'(╯°□°)╯︵ ┻━┻'};
  case '/unflip':return {send:(arg?arg+' ':'')+'┬─┬ノ( º _ ºノ)'};
  case '/lenny':return {send:(arg?arg+' ':'')+'( ͡° ͜ʖ ͡°)'};
  case '/me':if(!arg)throw Error('Use /me action');return {send:'*'+person(state.me.uid).name+' '+arg+'*'};
  case '/spoiler':if(!arg)throw Error('Use /spoiler text');return {send:'||'+arg+'||'};
  case '/roll':{const sides=Math.min(1000,Math.max(2,parseInt(arg)||6));return {send:'🎲 rolled **'+(1+Math.floor(Math.random()*sides))+'** (d'+sides+')'}}
  case '/flip':return {send:'🪙 flipped **'+(Math.random()<.5?'Heads':'Tails')+'**'};
  case '/8ball':if(!arg)throw Error('Ask a question: /8ball will I win?');return {send:'🎱 *'+arg+'*\n> '+BALL[Math.floor(Math.random()*BALL.length)]};
  case '/poll':{if(!arg){ctx.openPollBuilder();return null}const parts=arg.split('|').map(s=>s.trim()).filter(Boolean);if(parts.length<3)throw Error('Use /poll question | option | option');if(parts.length>11)throw Error('Polls can have up to 10 options.');return {send:pollText(parts[0],parts.slice(1))}}
  case '/profile':{const id=findUser(arg)||state.me.uid;ctx.openProfile(id);return null}
  case '/dm':{const id=findUser(arg);if(!id)throw Error('Choose a Nova username.');if(!state.friends[id])throw Error('You can only message friends. Use /friend first.');ctx.openDM(id);return null}
  case '/friend':{const id=findUser(arg);if(!id)throw Error('Choose a Nova username.');await ctx.addFriend(id);return null}
  case '/clear':ctx.clearView();return null;
  case '/announce':{if(!isOwner())throw Error('Only the owner can announce.');if(!arg)throw Error('Use /announce message');await ctx.api.send('channels/announcements/messages',{author:state.me.uid,text:arg});toast('Posted to #announcements.');return null}
  case '/resetchat':{if(!isOwner())throw Error('Only the owner can do this.');ctx.resetPublic();return null}
 }
 // Everything else (gift, moderation, owner tools) uses the established command runner.
 const handled=await runCommand(text,ctx.legacy());
 if(!handled)throw Error('Unknown command. Type /help to see them all.');
 return null;
}
