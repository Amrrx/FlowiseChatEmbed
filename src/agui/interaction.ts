import type { CardInteraction } from './types';

export const buildCardInteractionBody = (interaction: CardInteraction): Record<string, any> => {
  return {
    question: '',
    card_interaction: {
      card_id: interaction.card_id,
      action_id: interaction.action_id,
      payload: interaction.payload,
    },
  };
};
