import { CardObject, GamePreConditions } from '../types/typings'

export function validateCardAction(
  card: CardObject,
  pileCard: CardObject,
  preCondition: GamePreConditions
) {
  // validate if card played is correct relative to preconditions and topmost pile card
  if (preCondition.enabled === true) {
    // preconditions: new jackwish color | suspended by ace | penalty by 7's
    if (preCondition.newColor === '' || preCondition.newColor === card.color) {
      return true
    } else if (preCondition.suspended && card.value === 'ace') {
      return true
    } else if (preCondition.toDraw > 0 && card.value === '7') {
      return true
    } else {
      return false
    }
  }
  // handle jacks
  if (card.value === 'jack') {
    // jack can be on everything else, except jacks
    if (pileCard.value !== 'jack') {
      return true
    } else {
      return false
    }
  }
  // general color on color, value on value
  if (card.value === pileCard.value || card.color === pileCard.color) {
    return true
  }
  return false
}
