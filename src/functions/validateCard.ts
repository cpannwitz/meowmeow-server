import { CardObject, GamePreConditions } from '../types/typings'
import logger from '../services/logger'

export function validateCard(
  card: CardObject,
  pileCard: CardObject,
  preCondition: GamePreConditions
) {
  logger.info(`LOG | : card`, card)
  logger.info(`LOG | : pileCard`, pileCard)
  logger.info(`LOG | : preCondition`, preCondition)
  if (card.value === 'jack' && pileCard.value === 'jack') {
    // no jacks on jacks!
    logger.info('CALLED HERE: 1')
    return false
  }
  if (card.value === 'jack' && preCondition.enabled === false) {
    // Jack can be on everything else.
    logger.info('CALLED HERE: 2')
    return true
  }
  if (
    card.value !== 'ace' &&
    pileCard.value === 'ace' &&
    preCondition.enabled === true &&
    preCondition.suspended === true
  ) {
    logger.info('CALLED HERE: 3')
    // If you"re supposed to take suspension, play ace or suspend
    return false
  }
  if (
    card.value !== '7' &&
    pileCard.value === '7' &&
    preCondition.enabled === true &&
    preCondition.toDraw > 0
  ) {
    logger.info('CALLED HERE: 4')
    // if youre supposed to draw due to 7, draw or play 7
    return false
  }
  if (
    card.color !== preCondition.newColor &&
    preCondition.enabled === true &&
    preCondition.newColor !== ''
  ) {
    logger.info('CALLED HERE: 5')
    // if there was a jack with wishcolor, play this color
    return false
  }
  if (card.color === preCondition.newColor && preCondition.enabled === true) {
    // If there is a jackwished color, the card will match
    logger.info('CALLED HERE: 6')
    return true
  }
  if (card.color !== pileCard.color && card.value !== pileCard.value) {
    // general "play accordingly" rule
    logger.info('CALLED HERE: 7')
    return false
  }
  logger.info('CALLED HERE: 8')
  return true
}
