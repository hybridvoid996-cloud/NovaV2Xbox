// Moving a button's ancestors during pointerdown can cancel the eventual click.
export function placeMusicCard(card,parent,before=null){if(!card||!parent)return false;if(card.parentElement===parent&&card.nextSibling===before)return false;if(typeof parent.moveBefore==='function'&&card.isConnected)parent.moveBefore(card,before);else parent.insertBefore(card,before);return true;}
