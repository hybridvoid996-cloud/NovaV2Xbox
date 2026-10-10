export function isPhoneDevice({userAgent='',touchPoints=0,coarse=false,width=0,height=0}={}){
 if(/iPhone|iPod|Android.*Mobile|Windows Phone|KaiOS|BlackBerry|BB10|webOS/i.test(userAgent))return true;
 return touchPoints>0&&coarse&&Math.min(width,height)>0&&Math.min(width,height)<=600;
}
