export const CHALLENGE_PERIOD=5*60*60*1000;
export function needsChallengeReset(progress,now,version=0){
 return progress.challengeScheduleVersion!==1||!progress.challenges?.length||!Number.isFinite(progress.resetAt)||progress.resetAt<=now||progress.challengeVersion!==version;
}
export function startChallengeCycle(progress,now){progress.challengeIssuedAt=now;progress.resetAt=now+CHALLENGE_PERIOD;progress.challengeScheduleVersion=1;}
