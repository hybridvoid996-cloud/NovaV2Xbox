export const CHALLENGE_PERIOD=7*60*60*1000;
export function needsChallengeReset(progress,now,version=0){
 return progress.challengeScheduleVersion!==2||!progress.challenges?.length||!Number.isFinite(progress.resetAt)||progress.resetAt<=now||progress.challengeVersion!==version;
}
export function startChallengeCycle(progress,now){progress.challengeIssuedAt=now;progress.resetAt=now+CHALLENGE_PERIOD;progress.challengeScheduleVersion=2;}

export const CHALLENGE_MINUTES=[20,25,30,35,40,45,50,55,60];
export const CHALLENGE_REWARDS=[25000,40000,60000,80000,100000,125000,150000,175000,225000];
export const CHALLENGE_REWARDS_VERSION=5;
export function upgradeChallengeRewards(progress){if(progress.challengeRewardsVersion===CHALLENGE_REWARDS_VERSION)return;for(const challenge of progress.challenges||[]){if(challenge.claimed)continue;const index=[10,15,20,30].indexOf(challenge.minutes);if(index>=0)challenge.reward=CHALLENGE_REWARDS[index]}progress.challengeRewardsVersion=CHALLENGE_REWARDS_VERSION}
