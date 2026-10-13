export function activeUserCount(records,now){return Object.values(records||{}).filter(record=>Number.isFinite(record?.at)&&now-record.at>=0&&now-record.at<60000).length;}
