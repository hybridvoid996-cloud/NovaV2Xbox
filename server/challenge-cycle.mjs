export const CHALLENGE_PERIOD=5*60*60*1000;
export function needsChallengeReset(progress,now,version=0){
 return progress.challengeScheduleVersion!==1||!progress.challenges?.length||!Number.isFinite(progress.resetAt)||progress.resetAt<=now||progress.challengeVersion!==version;
}
export function startChallengeCycle(progress,now){progress.challengeIssuedAt=now;progress.resetAt=now+CHALLENGE_PERIOD;progress.challengeScheduleVersion=1;}

export const CHALLENGE_REWARDS=[15000,30000,45000,60000];
export const CHALLENGE_REWARDS_VERSION=4;
export function upgradeChallengeRewards(progress){if(progress.challengeRewardsVersion===CHALLENGE_REWARDS_VERSION)return;for(const challenge of progress.challenges||[]){if(challenge.claimed)continue;const index=[10,15,20,30].indexOf(challenge.minutes);if(index>=0)challenge.reward=CHALLENGE_REWARDS[index]}progress.challengeRewardsVersion=CHALLENGE_REWARDS_VERSION}
