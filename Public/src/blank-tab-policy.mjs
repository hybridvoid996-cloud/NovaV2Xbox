export const classroomTitle='Home - Google Classroom';
export const classroomIcon='https://ssl.gstatic.com/classroom/favicon.png';
export function blankTabStyle(title,icon,origin){
 let url;try{url=new URL(icon||classroomIcon,origin);if(!['https:','http:'].includes(url.protocol)&&!url.href.startsWith('data:image/'))throw Error()}catch{url=new URL(classroomIcon)}
 return {title:String(title||classroomTitle).slice(0,100),icon:url.href};
}
export function shouldOpenBlank({authenticated,complete,topLevel,hosted,enabled=true,regular=false}){return !!(authenticated&&complete&&topLevel&&!hosted&&enabled&&!regular)}
